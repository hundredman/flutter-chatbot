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

    // 3.5 앱 만들기 요청인지 먼저 확인
    const isAppCreationRequest = /앱\s*(만들|구현|개발|만드|코드)|앱을?\s*(만들|구현|개발)|만들기|만들어줘|구현해줘|개발해줘/i.test(question);

    // 질문 유형 감지 (설명/개념 질문인지)
    const isExplanationQuestion = /뭔가요|무엇인가요|뭐야|뭐예요|무엇이야|무엇인지|설명해|어떻게\s*작동|차이점|차이가|비교|what\s*is|explain/i.test(question);

    // 3. 컨텍스트 구성 (앱 만들기 요청이 아니면 템플릿 코드 제외)
    const context = results.matches
      .map((match, i) => {
        const metadata = match.metadata || {};
        let content = (metadata.content || '').substring(0, 1000);

        // 설명 질문일 경우 템플릿의 코드 블록 제외하고 설명만 추출
        if (isExplanationQuestion && content.includes('```dart') && content.includes('void main()')) {
          // 코드 블록 전 설명 부분만 추출
          const beforeCode = content.split('```dart')[0].trim();
          if (beforeCode.length > 50) {
            content = beforeCode;
          } else {
            // 템플릿이면 건너뛰기
            return null;
          }
        }

        return `[Source ${i + 1}] ${metadata.title || 'Flutter Documentation'}
URL: ${metadata.url || ''}
Content: ${content}${content.length >= 1000 ? '...' : ''}
---`;
      })
      .filter(Boolean)
      .join('\n\n');

    // 키워드 기반 템플릿 매칭 (앱 만들기 요청일 때만)
    const appKeywordMap = {
      'todo|투두|할일|할 일': 'ToDo',
      '계산기|calculator': '계산기',
      '로그인|login': '로그인',
      '채팅|chat': '채팅',
      '날씨|weather': '날씨',
      '메모|note': '메모장',
      '쇼핑|shopping|카트|cart': '쇼핑',
      '프로필|profile': '프로필',
      '설정|setting': '설정',
      '갤러리|gallery|이미지': '갤러리',
      '타이머|timer|스톱워치': '타이머',
      '검색|search': '검색',
      '바텀\s*네비게이션|bottom\s*nav|탭\s*바': '네비게이션',
      '스플래시|splash': '스플래시',
      '카운터|counter': '카운터',
      '좋아요|like|하트': '좋아요',
    };

    // 질문에서 앱 유형 감지 (앱 만들기 요청일 때만)
    let detectedAppType = null;
    if (isAppCreationRequest) {
      for (const [pattern, appType] of Object.entries(appKeywordMap)) {
        if (new RegExp(pattern, 'i').test(question)) {
          detectedAppType = appType;
          break;
        }
      }
    }

    // 감지된 앱 유형으로 템플릿 찾기
    let bestMatch = results.matches[0];
    if (detectedAppType) {
      const matchingTemplate = results.matches.find(m =>
        (m.metadata?.title || '').includes(detectedAppType)
      );
      if (matchingTemplate) {
        bestMatch = matchingTemplate;
        console.log(`🎯 Keyword match: "${detectedAppType}" -> ${matchingTemplate.metadata?.title}`);
      }
    }

    const topContent = bestMatch?.metadata?.content || '';
    const topScore = bestMatch?.score || 0;

    // 템플릿에 dart 코드 블록이 있고, 앱 만들기 요청이면서 설명 질문이 아닐 때만 직접 반환
    if (isAppCreationRequest && !isExplanationQuestion && topContent.includes('```dart') && topContent.includes('void main()')) {
      console.log('📦 Direct template match found, returning without AI');

      // 코드 블록 추출
      const codeMatch = topContent.match(/```dart[\s\S]*?```/);
      if (codeMatch) {
        // 제목에서 첫 번째 의미 있는 부분만 추출 (예: "ToDo 앱" from "ToDo 앱 투두앱 할일앱...")
        const rawTitle = bestMatch.metadata?.title || 'Flutter App';
        const cleanTitle = rawTitle.split(/\s+/).slice(0, 2).join(' ').replace(/만들기|구현|Flutter/gi, '').trim() || 'Flutter 앱';
        // 을/를 구분 (받침 있으면 을, 없으면 를)
        const lastChar = cleanTitle.charCodeAt(cleanTitle.length - 1);
        const hasJongseong = lastChar >= 0xAC00 && lastChar <= 0xD7A3 && (lastChar - 0xAC00) % 28 !== 0;
        const particle = hasJongseong ? '을' : '를';
        const directAnswer = `${cleanTitle}${particle} 구현하는 방법입니다.\n\n${codeMatch[0]}\n\n위 코드를 복사하여 사용하세요.`;

        return Response.json(
          {
            success: true,
            answer: directAnswer,
            sources: results.matches.map((match) => ({
              title: match.metadata?.title || 'Flutter Documentation',
              url: match.metadata?.url || '',
              similarity: match.score || 0,
            })),
            confidence: topScore,
            provider: 'template',
          },
          { headers: corsHeaders }
        );
      }
    }

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
1. Explain the concept clearly in 3-5 sentences
2. Describe when and why to use it
3. Provide a SHORT code snippet (10-20 lines max) showing basic usage
4. Do NOT provide full app code with void main()
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

    // 3. 잘못된 Dart 문법 수정 (공백 누락, 오타, 잘못된 메서드명)
    answer = answer
      // 공백 누락 수정
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
      .replace(/@overridewidgetcreate/gi, '@override\n  Widget build')
      .replace(/Buildectx/g, 'BuildContext ctx')
      .replace(/notifyListners/g, 'notifyListeners')
      .replace(/MaterialApplcation/g, 'MaterialApp')
      .replace(/Elevatedbutton/gi, 'ElevatedButton')
      .replace(/listview\.builder/gi, 'ListView.builder')
      .replace(/sizedbox/gi, 'SizedBox')
      .replace(/center\(/gi, 'Center(')

      // 잘못된 extends 패턴
      .replace(/(\w+)extends(\w+)/g, '$1 extends $2')
      .replace(/(\w+) extends (\w+)/g, '$1 extends $2')

      // 잘못된 import
      .replace(/import'package/g, "import 'package")

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

    // 4. 이상한 패턴 감지
    const gibberishPatterns = [
      /\w{40,}/g,  // 40자 이상 연속 문자
      /안녕~~~?/g,
      /\^\^/g,
      /~{2,}/g,
    ];
    const hasGibberish = gibberishPatterns.some(pattern => pattern.test(answer));

    // 5. gibberish 감지시 첫 번째 코드 블록까지만
    if (hasGibberish) {
      const firstCodeEnd = answer.indexOf('```', answer.indexOf('```') + 3);
      if (firstCodeEnd > 0) {
        answer = answer.substring(0, firstCodeEnd + 3);
      }
    }

    // 6. 길이 제한 (앱 만들기 등 긴 응답 허용)
    if (answer.length > 2500) {
      // 코드 블록이 잘리지 않도록 마지막 완전한 코드 블록까지만
      const lastCodeEnd = answer.lastIndexOf('```', 2500);
      if (lastCodeEnd > 500) {
        answer = answer.substring(0, lastCodeEnd + 3);
      } else {
        answer = answer.substring(0, 2500);
      }
    }

    // 7. 정리
    answer = answer.replace(/\n{3,}/g, '\n\n').trim();

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
