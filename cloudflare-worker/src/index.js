/**
 * Flutter Chatbot - Cloudflare Worker
 * 100% 무료 통합 백엔드
 * - Workers AI (LLM, 임베딩)
 * - Vectorize (벡터 검색)
 * - D1 Database (대화 기록)
 */

// 허용된 Origin 목록
const ALLOWED_ORIGINS = [
  'https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev',
  'https://hiprojectflutterchatbot.web.app',
  'https://flutter-chatbot.vercel.app',  // Vercel 배포
  'http://localhost:5173',  // 로컬 개발
  'http://localhost:3000',  // 로컬 개발
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.workers.dev');

    // CORS 헤더 (허용된 origin만)
    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);

    // 라우팅
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      return handleChat(request, env, corsHeaders);
    }

    if (url.pathname === '/api/history' && request.method === 'GET') {
      return handleHistory(request, env, corsHeaders);
    }

    if (url.pathname === '/api/health') {
      return Response.json({
        status: 'ok',
        service: 'Flutter Chatbot Worker',
        cost: '$0/month (100% free)',
      }, { headers: corsHeaders });
    }

    if (url.pathname === '/api/test-insert' && request.method === 'POST') {
      return handleTestInsert(request, env, corsHeaders);
    }

    if (url.pathname === '/api/sync-docs' && request.method === 'POST') {
      return handleSyncDocs(request, env, corsHeaders);
    }

    return Response.json(
      { error: 'Not found' },
      { status: 404, headers: corsHeaders }
    );
  },
};

/**
 * 테스트 데이터 삽입
 */
async function handleTestInsert(request, env, corsHeaders) {
  try {
    const testDocs = [
      {
        title: "What is Flutter?",
        content: "Flutter is an open-source UI software development kit created by Google. It is used to develop cross-platform applications for Android, iOS, Linux, macOS, Windows, and the web from a single codebase. Flutter uses the Dart programming language and provides a rich set of pre-built widgets.",
      },
      {
        title: "Getting Started with Flutter",
        content: "To get started with Flutter, you need to install the Flutter SDK and set up your development environment. You can use Android Studio, VS Code, or IntelliJ IDEA as your IDE. Flutter supports hot reload, which allows you to see changes instantly without restarting your app.",
      },
      {
        title: "Flutter Widgets",
        content: "Flutter widgets are the building blocks of a Flutter app's user interface. Everything in Flutter is a widget, from a simple button to a complex layout. There are two types of widgets: StatelessWidget for static content and StatefulWidget for dynamic content that can change over time.",
      },
      {
        title: "State Management in Flutter",
        content: "State management is crucial in Flutter applications. Common approaches include setState for simple cases, Provider for medium complexity, Bloc for enterprise apps, and Riverpod as a modern alternative. Choose based on your app's complexity and team preference.",
      },
      {
        title: "Flutter Navigation",
        content: "Flutter provides powerful navigation features through the Navigator widget. You can push and pop routes, pass data between screens, and create named routes. For complex navigation, consider using packages like go_router or auto_route.",
      }
    ];

    console.log('Inserting test documents into Vectorize...');

    const vectors = [];
    for (let i = 0; i < testDocs.length; i++) {
      const doc = testDocs[i];

      // 임베딩 생성
      const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: doc.content,
      });

      vectors.push({
        id: `test_doc_${i}`,
        values: embeddings.data[0],
        metadata: {
          title: doc.title,
          content: doc.content,
          type: 'test',
        },
      });
    }

    // Vectorize에 벡터 삽입
    await env.VECTORIZE.insert(vectors);

    console.log(`Successfully inserted ${vectors.length} test documents`);

    return Response.json({
      success: true,
      message: `Inserted ${vectors.length} test documents`,
      documents: testDocs.map(d => d.title),
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Test insert error:', error);
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * Flutter 문서 동기화 (크롤링된 문서를 Vectorize에 삽입)
 */
async function handleSyncDocs(request, env, corsHeaders) {
  try {
    const { documents } = await request.json();

    if (!documents || !Array.isArray(documents)) {
      return Response.json(
        { error: 'documents array is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Syncing ${documents.length} documents to Vectorize...`);

    const vectors = [];
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      if (!doc.content || !doc.title) {
        console.log(`Skipping document ${i}: missing content or title`);
        continue;
      }

      // 임베딩 생성
      const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: doc.content.substring(0, 4000), // 임베딩 모델 입력 제한
      });

      // URL에서 ID 생성 (고유 식별자)
      const docId = doc.url
        ? doc.url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_')
        : `doc_${Date.now()}_${i}`;

      vectors.push({
        id: docId,
        values: embeddings.data[0],
        metadata: {
          title: doc.title,
          content: doc.content,
          url: doc.url || '',
          type: 'official-docs',
          fetchedAt: doc.fetchedAt || new Date().toISOString(),
        },
      });
    }

    // Vectorize에 벡터 삽입
    if (vectors.length > 0) {
      await env.VECTORIZE.insert(vectors);
      console.log(`Successfully inserted ${vectors.length} documents`);
    }

    return Response.json({
      success: true,
      message: `Inserted ${vectors.length} documents`,
      documents: vectors.map(v => v.metadata.title),
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Sync docs error:', error);
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * AI Provider: Cloudflare Workers AI (Fallback)
 */
async function callCloudflareAI(messages, env) {
  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages,
    max_tokens: 1024,  // 앱 만들기 등 긴 응답 허용
    temperature: 0.2,  // 더 정확한 코드를 위해 낮춤
    repetition_penalty: 1.3,
    frequency_penalty: 0.5,
  });
  return response.response || 'No response generated';
}

/**
 * AI Provider: Google Gemini (무료 60 요청/분)
 */
async function callGeminiAI(messages, env) {
  if (!env.GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  // Convert messages to Gemini format
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');

  const contents = userMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  // Add system message as first user message if exists
  if (systemMessage) {
    contents.unshift({
      role: 'user',
      parts: [{ text: systemMessage.content }]
    });
  }

  // 10초 타임아웃 설정
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.2,  // 더 정확한 코드를 위해 낮춤
            topP: 0.85,
            maxOutputTokens: 1024,  // 앱 만들기 등 긴 응답 허용
          },
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Multi-Provider AI with Fallback Chain
 * Priority: Gemini → Cloudflare Workers AI
 * (Gemini가 코드 품질이 더 좋음)
 */
async function callAIWithFallback(messages, env) {
  const providers = [
    { name: 'Gemini', call: callGeminiAI },
    { name: 'Cloudflare Workers AI', call: callCloudflareAI },
  ];

  let lastError = null;

  for (const provider of providers) {
    try {
      console.log(`🤖 Trying ${provider.name}...`);
      const answer = await provider.call(messages, env);
      console.log(`✅ ${provider.name} succeeded`);
      return { answer, provider: provider.name };
    } catch (error) {
      console.log(`❌ ${provider.name} failed: ${error.message}`);
      lastError = error;

      // Rate limit, quota 초과, context window 초과면 다음 provider 시도
      if (error.message.includes('rate limit') ||
          error.message.includes('429') ||
          error.message.includes('quota') ||
          error.message.includes('limit exceeded') ||
          error.message.includes('context window') ||
          error.message.includes('tokens') && error.message.includes('exceeded')) {
        continue;
      }

      // API 키가 없으면 다음 provider 시도
      if (error.message.includes('not configured')) {
        continue;
      }

      // 403 Forbidden, 400 Invalid API Key 에러도 다음 provider 시도
      if (error.message.includes('403') ||
          error.message.includes('Forbidden') ||
          error.message.includes('400') ||
          error.message.includes('API key not valid') ||
          error.message.includes('INVALID_ARGUMENT')) {
        continue;
      }

      // 그 외 에러는 재시도하지 않고 실패
      throw error;
    }
  }

  // 모든 provider 실패
  throw new Error(`모든 AI 제공자가 사용 불가합니다. ${lastError?.message || ''}`);
}

/**
 * 채팅 처리 (통합 RAG 파이프라인)
 */
async function handleChat(request, env, corsHeaders) {
  try {
    const { question, language = 'en', conversationId } = await request.json();

    if (!question || typeof question !== 'string') {
      return Response.json(
        { error: 'Question is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Processing question: "${question}"`);

    // 1. 임베딩 생성 (Workers AI - 무료)
    console.log('Generating embeddings...');
    const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: question,
    });

    const queryVector = embeddings.data[0];
    console.log(`Generated ${queryVector.length}-dimensional vector`);

    // 2. 벡터 검색 (Vectorize - 무료)
    console.log('Searching vector database...');
    const results = await env.VECTORIZE.query(queryVector, {
      topK: 5,  // 앱 템플릿 매칭을 위해 5개로 확장
      returnValues: false,
      returnMetadata: 'all',
    });

    console.log(`Found ${results.matches.length} similar documents`);

    // 질문 유형 감지 (설명/개념 질문인지)
    const isExplanationQuestion = /뭔가요|무엇인가요|뭐야|뭐예요|무엇이야|무엇인지|설명해|어떻게\s*작동|차이점|차이가|비교|사용법|사용방법|what\s*is|explain|how\s*to\s*use/i.test(question);

    // 주요 토픽별 공식 문서 링크
    const docLinks = {
      'firebase|파이어베이스': 'https://firebase.flutter.dev/docs/overview',
      'firebaseauth|firebase\s*auth|인증': 'https://firebase.flutter.dev/docs/auth/overview',
      'firestore|파이어스토어': 'https://firebase.flutter.dev/docs/firestore/overview',
      'provider|프로바이더': 'https://pub.dev/packages/provider',
      'riverpod|리버팟': 'https://riverpod.dev/docs/introduction/getting_started',
      'bloc|블록': 'https://bloclibrary.dev/#/gettingstarted',
      'getx|겟엑스': 'https://pub.dev/packages/get',
      'navigation|네비게이션|라우팅': 'https://docs.flutter.dev/ui/navigation',
      'animation|애니메이션': 'https://docs.flutter.dev/ui/animations',
      'state\s*management|상태\s*관리': 'https://docs.flutter.dev/data-and-backend/state-mgmt',
      'http|api\s*call|api\s*호출': 'https://docs.flutter.dev/cookbook/networking/fetch-data',
      'sqlite|sqflite|로컬\s*db': 'https://docs.flutter.dev/cookbook/persistence/sqlite',
      'shared\s*pref|sharedpreferences': 'https://pub.dev/packages/shared_preferences',
      'camera|카메라': 'https://pub.dev/packages/camera',
      'image\s*picker|이미지\s*선택': 'https://pub.dev/packages/image_picker',
      'permission|권한': 'https://pub.dev/packages/permission_handler',
      'notification|알림|푸시': 'https://firebase.flutter.dev/docs/messaging/overview',
      'hero': 'https://docs.flutter.dev/ui/animations/hero-animations',
      'form|폼|입력': 'https://docs.flutter.dev/cookbook/forms',
      'listview|리스트뷰': 'https://docs.flutter.dev/cookbook/lists',
      'gridview|그리드뷰': 'https://api.flutter.dev/flutter/widgets/GridView-class.html',
    };

    // 질문에서 관련 문서 링크 찾기
    let relevantDocLink = null;
    for (const [pattern, url] of Object.entries(docLinks)) {
      if (new RegExp(pattern, 'i').test(question)) {
        relevantDocLink = url;
        break;
      }
    }

    // 키워드 기반 앱 템플릿 매칭 (직접 반환용)
    // 키: 매칭 패턴, 값: [템플릿 제목 키워드, 앱 이름]
    const appTemplateMap = {
      'todo|투두|할일|할 일': ['ToDo', 'ToDo 앱'],
      '계산기|calculator': ['계산기', '계산기'],
      '로그인|login': ['로그인', '로그인 화면'],
      '채팅|chat': ['채팅', '채팅 앱'],
      '날씨|weather': ['날씨', '날씨 앱'],
      '메모장|메모\s*앱|notes?\s*app': ['메모장', '메모장 앱'],
      '쇼핑\s*앱|shopping\s*app|장바구니\s*앱': ['쇼핑', '쇼핑 앱'],
      '프로필\s*앱|profile\s*app': ['프로필', '프로필 화면'],
      '설정\s*앱|settings?\s*app': ['설정', '설정 화면'],
      '갤러리\s*앱|gallery\s*app|사진\s*앱': ['갤러리', '갤러리 앱'],
      '타이머\s*앱|timer\s*app|스톱워치': ['타이머', '타이머 앱'],
      '바텀\s*네비게이션|bottom\s*nav|탭\s*바\s*앱': ['네비게이션', '바텀 네비게이션'],
      '스플래시\s*스크린|splash\s*screen': ['스플래시', '스플래시 화면'],
      '카운터\s*앱|counter\s*app': ['카운터', '카운터 앱'],
      '좋아요\s*버튼|like\s*button|하트\s*버튼': ['좋아요', '좋아요 버튼'],
    };

    // 질문에서 앱 템플릿 키워드 매칭 (더 엄격하게)
    let matchedTemplate = null;
    let templateDisplayName = null;
    for (const [pattern, [templateKey, displayName]] of Object.entries(appTemplateMap)) {
      if (new RegExp(pattern, 'i').test(question)) {
        // 벡터 검색 결과에서 해당 템플릿 찾기
        const template = results.matches.find(m =>
          (m.metadata?.title || '').includes(templateKey) &&
          (m.metadata?.content || '').includes('void main()')
        );
        if (template) {
          matchedTemplate = template;
          templateDisplayName = displayName;
          console.log(`🎯 Direct template match: "${pattern}" -> ${template.metadata?.title}`);
        }
        break;
      }
    }

    // 설명 질문일 때: AI 우회하고 직접 응답 생성 (코드 없이 링크만)
    if (isExplanationQuestion && relevantDocLink) {
      console.log('📖 Explanation question detected, returning doc link directly');

      // 벡터 검색 결과에서 관련 설명 추출
      const topMatch = results.matches[0];
      let explanation = '';
      if (topMatch?.metadata?.content) {
        // 코드 블록 제외하고 텍스트만 추출
        let content = topMatch.metadata.content;
        content = content.replace(/```[\s\S]*?```/g, '').trim();
        // 처음 500자만
        explanation = content.substring(0, 500);
        if (content.length > 500) explanation += '...';
      }

      // 토픽 이름 추출
      const topicMatch = question.match(/(\w+|[가-힣]+)\s*(사용법|사용방법|뭔가요|무엇|설명)/i);
      const topicName = topicMatch ? topicMatch[1] : 'Flutter';

      const directAnswer = `## ${topicName} 개요

${explanation || `${topicName}에 대한 Flutter 공식 문서를 참고해주세요.`}

**공식 문서:** ${relevantDocLink}

코드 예제가 필요하시면 "${topicName} 코드 예제"라고 질문해주세요.`;

      return Response.json(
        {
          success: true,
          answer: directAnswer,
          sources: results.matches.slice(0, 3).map((match) => ({
            title: match.metadata?.title || 'Flutter Documentation',
            url: match.metadata?.url || '',
            similarity: match.score || 0,
          })),
          confidence: 0.9,
          provider: 'direct',
        },
        { headers: corsHeaders }
      );
    }

    // 직접 템플릿 반환 (키워드가 정확히 매칭되고 설명 질문이 아닐 때만)
    if (matchedTemplate && !isExplanationQuestion) {
      const templateContent = matchedTemplate.metadata?.content || '';
      const codeMatch = templateContent.match(/```dart[\s\S]*?```/);
      if (codeMatch) {
        console.log('📦 Returning template directly without AI');
        // 을/를 구분 (받침 있으면 을, 없으면 를)
        const lastChar = templateDisplayName.charCodeAt(templateDisplayName.length - 1);
        const hasJongseong = lastChar >= 0xAC00 && lastChar <= 0xD7A3 && (lastChar - 0xAC00) % 28 !== 0;
        const particle = hasJongseong ? '을' : '를';
        const directAnswer = `${templateDisplayName}${particle} 구현하는 방법입니다.\n\n${codeMatch[0]}\n\n위 코드를 복사하여 사용하세요.`;

        return Response.json(
          {
            success: true,
            answer: directAnswer,
            sources: results.matches.slice(0, 3).map((match) => ({
              title: match.metadata?.title || 'Flutter Documentation',
              url: match.metadata?.url || '',
              similarity: match.score || 0,
            })),
            confidence: matchedTemplate.score || 0.8,
            provider: 'template',
          },
          { headers: corsHeaders }
        );
      }
    }

    // 3. 컨텍스트 구성 (템플릿 전체 코드는 제외, 문서 내용만)
    const context = results.matches
      .map((match, i) => {
        const metadata = match.metadata || {};
        let content = (metadata.content || '').substring(0, 1000);

        // 전체 앱 템플릿 코드는 컨텍스트에서 제외 (AI가 그대로 복사하는 것 방지)
        if (content.includes('```dart') && content.includes('void main()') && content.includes('runApp(')) {
          // 코드 블록 전 설명 부분만 추출
          const beforeCode = content.split('```dart')[0].trim();
          if (beforeCode.length > 50) {
            content = beforeCode;
          } else {
            return null; // 설명 없는 순수 템플릿은 건너뛰기
          }
        }

        return `[Source ${i + 1}] ${metadata.title || 'Flutter Documentation'}
URL: ${metadata.url || ''}
Content: ${content}${content.length >= 1000 ? '...' : ''}
---`;
      })
      .filter(Boolean)
      .join('\n\n');

    // 벡터 검색 결과 정보
    const topScore = results.matches[0]?.score || 0;

    // 4. LLM 답변 생성 (Workers AI - 무료)
    console.log('Generating answer with LLM...');

    const languageInstructions = {
      ko: 'IMPORTANT: You MUST respond in Korean (한국어). 모든 답변은 반드시 한국어로 작성해야 합니다.',
      en: 'Respond in English.',
    };

    // 복잡한 앱 요청 감지
    const isComplexAppRequest = /앱\s*(만들기|구현|개발)|calculator|todo\s*list|login|계산기|투두|로그인|채팅|날씨|메모|쇼핑|프로필|설정|갤러리|타이머|검색|네비게이션|스플래시/i.test(question);

    // 템플릿이 있는지 확인 (Reference에 dart 코드 블록이 있는지)
    const hasTemplate = context.includes('```dart') && context.includes('void main()');

    const systemPrompt = `You are a senior Flutter/Dart developer. Write CORRECT, COMPILABLE code only.

${languageInstructions[language] || languageInstructions.en}

Reference:
${context}

${isExplanationQuestion ?
`EXPLANATION QUESTION DETECTED - User wants to understand a concept.
DO NOT generate code. Instead:
1. Explain the concept clearly in 3-5 sentences
2. Describe when and why to use it
3. List key classes/methods involved (e.g., "FirebaseAuth.instance, signInWithEmailAndPassword()")
4. End with: "공식 문서: ${relevantDocLink || 'https://docs.flutter.dev'}"

IMPORTANT: Do NOT write any \`\`\`dart code blocks. Just explain and provide the documentation link.
The user can ask for code examples separately if needed.
` :
(isComplexAppRequest ? (hasTemplate ?
`CRITICAL: TEMPLATE CODE FOUND IN REFERENCE SECTION!
You MUST copy the code block from Reference EXACTLY as written.
DO NOT modify, summarize, or rewrite the code.
DO NOT add spaces or change formatting.
Just extract the \`\`\`dart code block from Reference and present it.
` :
`NO TEMPLATE AVAILABLE - Keep response simple:
1. Provide basic app structure with Scaffold only
2. Suggest follow-up questions:
   - "더 자세한 기능이 필요하시면 질문해주세요"
   - "데이터 저장 방법이 궁금하시면 질문해주세요"
`) : '')}
CRITICAL CODE RULES:
1. ALWAYS add spaces between keywords: "void main()" "extends StatelessWidget"
2. ALWAYS use exact class names: StatelessWidget, StatefulWidget, BuildContext
3. ALWAYS use @override (lowercase), Widget build() method
4. ALWAYS match opening and closing brackets { }
5. ONLY use real Flutter widgets and methods
6. StatefulWidget State class format: class _WidgetNameState extends State<WidgetName>

RESPONSE FORMAT:
1. Brief explanation (2-3 sentences)
2. Complete, runnable code example:
\`\`\`dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: const Text('Title')),
        body: const Center(child: Text('Content')),
      ),
    );
  }
}
\`\`\`
3. Brief usage tip

NO greetings or casual language. Technical content only.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ];

    // Multi-Provider AI with automatic fallback
    const { answer: rawAnswer, provider } = await callAIWithFallback(messages, env);
    console.log(`📊 Used provider: ${provider}`);

    // 응답 품질 검증 및 정리
    let answer = rawAnswer || '';

    // 1. 불필요한 일상 대화 제거
    const chatPatterns = [
      /감사합니다[!.~]*\s*/gi,
      /안녕[하세요~!.]*\s*/gi,
      /좋은 하루[되세요!.~]*\s*/gi,
      /도움이 되[었으면셨으면][!.~]*\s*/gi,
      /질문 있으시면[^.]*[.!]/gi,
      /언제든지 물어보세요[!.~]*/gi,
      /다음에[는도]?\s*[다른 ]*질문[이나 ]?[있으시면도움이 필요하시면][^.]*[.!]*/gi,
      /잘 부탁[드립니다해요!.~]*/gi,
      /함께하[셨습니다였습니다][^.]*[.!]*/gi,
      /아무거나[^.]*[.!]*/gi,
      /후회없이[^.]*[.!]*/gi,
      /\.trim\(\);[^`]*/g,  // 코드 잔해
    ];
    chatPatterns.forEach(pattern => {
      answer = answer.replace(pattern, '');
    });

    // 2. 연속된 코드 블록 합치기
    answer = answer.replace(/```\s*\n+```dart\n/g, '\n');
    answer = answer.replace(/```dart\n+```dart\n/g, '```dart\n');

    // 3. 코드 블록 내 심각한 오류 감지
    const codeBlockMatch = answer.match(/```dart([\s\S]*?)```/);
    if (codeBlockMatch) {
      const codeContent = codeBlockMatch[1];
      const severeErrors = [
        /class\w{3,}extends/i,  // classMyAppextends (공백 없음)
        /return\w{3,}\(/i,      // returnMaterialApp( (공백 없음)
        /final\w{3,}=/i,        // finaltextcontroller= (공백 없음)
        /@\w+\(\)[^;{]*[@}]/,   // @initiate()'...' (잘못된 어노테이션)
        /@overridewidget/i,     // @overridewidgetBuild (공백 없음)
        /import'[^']+'/,        // import'package (공백 없음)
        /:\s*\/\//,             // 주석이 값 위치에
        /\.\.\./,               // ... 잘림 표시가 코드 내에
        /[가-힣]{5,}/,          // 한글이 코드 내에 많이 있음
      ];
      const hasSevereError = severeErrors.some(p => p.test(codeContent));

      if (hasSevereError) {
        console.log('⚠️ Severe code error detected, removing broken code block');
        // 코드 블록 전 설명만 유지
        const beforeCode = answer.split('```dart')[0].trim();
        if (beforeCode.length > 100) {
          answer = beforeCode + '\n\n코드 예제는 공식 Flutter 문서를 참고해주세요: https://docs.flutter.dev';
        } else {
          // 설명도 부족하면 기본 안내
          answer = `${question}에 대한 정확한 코드 생성에 실패했습니다.\n\n공식 문서를 참고해주세요:\n- Flutter: https://docs.flutter.dev\n- Firebase: https://firebase.flutter.dev`;
        }
      }
    }

    // 4. 잘못된 Dart 문법 수정 (공백 누락, 오타, 잘못된 메서드명)
    answer = answer
      // 심각한 공백 누락 수정 (class, return, final, void 등)
      .replace(/class(\w)/g, 'class $1')
      .replace(/return(\w)/g, 'return $1')
      .replace(/final(\w)/g, 'final $1')
      .replace(/const(\w)/g, 'const $1')
      .replace(/void(\w)/g, 'void $1')

      // 기존 공백 누락 수정
      .replace(/voidmain\(\)/g, 'void main()')
      .replace(/void main\(\)\{/g, 'void main() {')
      .replace(/runApp\(MyApp\(\)\);}/g, 'runApp(MyApp());\n}')
      .replace(/BuildContextcontext/g, 'BuildContext context')
      .replace(/BuildContext context\)/g, 'BuildContext context)')
      .replace(/extends StatelessWidget\{/g, 'extends StatelessWidget {')
      .replace(/extends StatefulWidget\{/g, 'extends StatefulWidget {')
      .replace(/extends State<(\w+)>\{/g, 'extends State<$1> {')
      .replace(/body:(\w)/g, 'body: $1')
      .replace(/appBar:(\w)/g, 'appBar: $1')
      .replace(/home:(\w)/g, 'home: $1')
      .replace(/child:(\w)/g, 'child: $1')
      .replace(/title:(\w)/g, 'title: $1')
      .replace(/context=context/g, 'context: context')
      .replace(/itemcount:/gi, 'itemCount: ')
      .replace(/itembuilder:/gi, 'itemBuilder: ')

      // 클래스명/메서드명 오타 수정
      .replace(/StatelessWidet/g, 'StatelessWidget')
      .replace(/StatefulWidet/g, 'StatefulWidget')
      .replace(/STATEfulWidget/gi, 'StatefulWidget')
      .replace(/Widgetbuild/g, 'Widget build')
      .replace(/Widget create\(/g, 'Widget build(')
      .replace(/@Override/g, '@override')
      .replace(/@overridewidget/gi, '@override\n  Widget ')
      .replace(/@initiate\(\)[^;]*/gi, '')  // 가짜 어노테이션 제거
      .replace(/Buildectx/g, 'BuildContext ctx')
      .replace(/notifyListners/g, 'notifyListeners')
      .replace(/MaterialApplcation/gi, 'MaterialApp')
      .replace(/MaterialAppllication/gi, 'MaterialApp')
      .replace(/Elevatedbutton/gi, 'ElevatedButton')
      .replace(/listview\.builder/gi, 'ListView.builder')
      .replace(/sizedbox/gi, 'SizedBox')
      .replace(/center\(/gi, 'Center(')

      // 잘못된 extends 패턴
      .replace(/(\w+)extends(\w+)/g, '$1 extends $2')

      // 잘못된 import
      .replace(/import'package/g, "import 'package")
      .replace(/import\s*'package\//g, "import 'package:")
      .replace(/FirebaseAuthentication\(\)/g, 'FirebaseAuth.instance')

      // 가상의 메서드 제거/수정
      .replace(/titleOnly\([^)]*\)/g, 'AppBar(title: Text("Title"))')
      .replace(/centerChild\(\)/g, 'Center(child: Text("Content"))')

      // 일반 정리
      .replace(/\.\.+/g, '.')
      .replace(/違い점/g, '차이점')
      .replace(/\s+\./g, '.')
      .replace(/appBar\s*:\s*title\s*:\s*"([^"]+)"/g, 'appBar: AppBar(title: Text("$1"))')
      .replace(/homepage\(\)/gi, 'HomePage()')
      .replace(/backgroundColorColors\./g, 'backgroundColor: Colors.')

      // 괄호 오류 (기본적인 것만)
      .replace(/<Text\(/g, 'Text(')
      .replace(/\/>(?=\s*[,\)])/g, ')');

    // 4. 긴 단어/gibberish 제거 (화면 가로 스크롤 방지)
    // 공백 없이 50자 이상 연속되는 문자열 제거 (URL, 패키지명 등 제외)
    answer = answer.replace(/(?<![`\/:])([a-zA-Z0-9가-힣_]{50,})(?![`])/g, (match) => {
      // 유효한 패키지명이나 URL은 유지
      if (match.includes('flutter') || match.includes('dart') || match.includes('http')) {
        return match.substring(0, 50) + '...';
      }
      return '[내용 생략]';
    });

    // 코드 블록 외부의 긴 연속 문자 제거
    const lines = answer.split('\n');
    const cleanedLines = lines.map(line => {
      // 코드 블록 내부가 아닌 경우만 처리
      if (!line.trim().startsWith('```') && !line.includes('import ')) {
        // 50자 이상 공백 없는 단어 잘라내기
        return line.replace(/\S{50,}/g, (match) => {
          if (match.startsWith('http') || match.includes('://')) {
            return match; // URL은 유지
          }
          return match.substring(0, 40) + '...';
        });
      }
      return line;
    });
    answer = cleanedLines.join('\n');

    // 이상한 패턴 감지
    const gibberishPatterns = [
      /[a-zA-Z]{60,}/g,  // 60자 이상 영문 연속
      /[가-힣]{40,}/g,   // 40자 이상 한글 연속
      /[a-zA-Z0-9_]{80,}/g, // 80자 이상 알파벳+숫자 연속
      /undefined{2,}/gi,
      /안녕~~~?/g,
      /\^\^/g,
      /~{3,}/g,
    ];
    const hasGibberish = gibberishPatterns.some(pattern => pattern.test(answer));

    // 5. gibberish 감지시 해당 부분 제거 또는 첫 번째 코드 블록까지만
    if (hasGibberish) {
      // 먼저 gibberish 패턴 직접 제거
      gibberishPatterns.forEach(pattern => {
        answer = answer.replace(pattern, '[...]');
      });

      // 여전히 이상하면 첫 번째 코드 블록까지만
      if (/[a-zA-Z0-9]{60,}/.test(answer)) {
        const firstCodeEnd = answer.indexOf('```', answer.indexOf('```') + 3);
        if (firstCodeEnd > 0) {
          answer = answer.substring(0, firstCodeEnd + 3);
        }
      }
    }

    // 6. 길이 제한 (설명 질문은 더 길게 허용)
    const maxLength = isExplanationQuestion ? 3500 : 2500;
    if (answer.length > maxLength) {
      // 코드 블록이 잘리지 않도록 마지막 완전한 코드 블록까지만
      const lastCodeEnd = answer.lastIndexOf('```', maxLength);
      if (lastCodeEnd > 500) {
        answer = answer.substring(0, lastCodeEnd + 3);
      } else {
        // 문장 단위로 자르기
        const lastSentence = answer.lastIndexOf('.', maxLength);
        if (lastSentence > maxLength - 500) {
          answer = answer.substring(0, lastSentence + 1);
        } else {
          answer = answer.substring(0, maxLength);
        }
      }
    }

    // 7. 정리
    answer = answer.replace(/\n{3,}/g, '\n\n').trim();

    // 8. 잘린 응답 감지 및 안내 추가
    const incompletePatterns = [
      /Example\s*Code:\s*$/i,
      /코드\s*예[시제]?:\s*$/,
      /다음과\s*같[이습]니다[.:]*\s*$/,
      /아래[와를]?\s*참[고조]하세요[.:]*\s*$/,
      /```dart\s*$/,
      /```\s*$/,
    ];
    const isIncomplete = incompletePatterns.some(p => p.test(answer));
    if (isIncomplete) {
      // 불완전한 마지막 부분 제거
      answer = answer.replace(/Example\s*Code:\s*$/i, '');
      answer = answer.replace(/코드\s*예[시제]?:\s*$/, '');
      answer = answer.replace(/다음과\s*같[이습]니다[.:]*\s*$/, '');
      answer = answer.replace(/```dart\s*$/, '');
      answer = answer.replace(/```\s*$/, '');
      answer = answer.trim();
      if (!answer.endsWith('.') && !answer.endsWith('```')) {
        answer += '\n\n더 자세한 코드 예제가 필요하시면 질문해주세요.';
      }
    }

    // 5. 대화 기록 저장 (D1 - 무료, 선택사항)
    if (conversationId && env.DB) {
      try {
        await env.DB.prepare(
          'INSERT INTO chat_history (conversation_id, question, answer, timestamp) VALUES (?, ?, ?, ?)'
        )
          .bind(conversationId, question, answer, new Date().toISOString())
          .run();
      } catch (dbError) {
        console.error('DB save error:', dbError);
        // DB 오류는 무시하고 계속 진행
      }
    }

    // 6. 응답 반환
    return Response.json(
      {
        success: true,
        answer: answer,
        sources: results.matches.map((match) => ({
          title: match.metadata?.title || 'Flutter Documentation',
          url: match.metadata?.url || '',
          similarity: match.score || 0,
        })),
        confidence: results.matches[0]?.score || 0,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Chat error:', error);

    // 리밋 초과 에러 감지
    const errorMessage = error.message || '';
    let userMessage = 'Internal server error';
    let statusCode = 500;

    if (errorMessage.includes('rate limit') || errorMessage.includes('limit exceeded')) {
      userMessage = '일일 사용량을 초과했습니다. 내일 자정(한국시간 오전 9시)에 다시 이용 가능합니다.';
      statusCode = 429; // Too Many Requests
    } else if (errorMessage.includes('neuron')) {
      userMessage = 'AI 처리 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      statusCode = 429;
    }

    return Response.json(
      {
        success: false,
        error: userMessage,
        technicalError: error.message, // 디버깅용
      },
      { status: statusCode, headers: corsHeaders }
    );
  }
}

/**
 * 대화 기록 조회 (D1 Database - 무료)
 */
async function handleHistory(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');

    if (!conversationId) {
      return Response.json(
        { error: 'conversationId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!env.DB) {
      return Response.json(
        {
          success: true,
          message: 'D1 Database not configured, using client-side storage',
          history: [],
        },
        { headers: corsHeaders }
      );
    }

    const { results } = await env.DB.prepare(
      'SELECT * FROM chat_history WHERE conversation_id = ? ORDER BY timestamp ASC'
    )
      .bind(conversationId)
      .all();

    return Response.json(
      {
        success: true,
        conversationId,
        history: results || [],
        messageCount: results?.length || 0,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('History error:', error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
