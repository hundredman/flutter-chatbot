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
    max_tokens: 600,
    temperature: 0.3,
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
            temperature: 0.3,
            topP: 0.9,
            maxOutputTokens: 600,  // 충분한 응답
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
      topK: 3,  // 토큰 한도 방지를 위해 3개로 제한
      returnValues: false,
      returnMetadata: 'all',
    });

    console.log(`Found ${results.matches.length} similar documents`);

    // 3. 컨텍스트 구성 (각 문서 최대 1000자로 제한)
    const context = results.matches
      .map((match, i) => {
        const metadata = match.metadata || {};
        const content = (metadata.content || '').substring(0, 1000);
        return `[Source ${i + 1}] ${metadata.title || 'Flutter Documentation'}
URL: ${metadata.url || ''}
Content: ${content}${content.length >= 1000 ? '...' : ''}
---`;
      })
      .join('\n\n');

    // 4. LLM 답변 생성 (Workers AI - 무료)
    console.log('Generating answer with LLM...');

    const languageInstructions = {
      ko: 'IMPORTANT: You MUST respond in Korean (한국어). 모든 답변은 반드시 한국어로 작성해야 합니다.',
      en: 'Respond in English.',
    };

    const systemPrompt = `You are a Flutter/Dart expert. Give accurate, complete technical answers.

${languageInstructions[language] || languageInstructions.en}

Reference:
${context}

FORMAT REQUIREMENTS:
1. Start with a clear 2-3 sentence explanation of the concept
2. If there are steps, number them clearly (1., 2., 3.) and explain EACH step
3. Include ONE complete, runnable code example with proper formatting:
   - Correct import statements
   - Proper indentation (2 spaces)
   - No syntax errors
4. End with a brief note about common use cases or tips
5. NO greetings, thanks, emojis, or casual language
6. Use proper punctuation (periods at end of sentences)`;

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

    // 3. 잘못된 Dart 문법 수정
    answer = answer
      .replace(/voidmain\(\)/g, 'void main()')
      .replace(/runApp\(MyApp\(\)\);}/g, 'runApp(MyApp());\n}')
      .replace(/BuildContextcontext/g, 'BuildContext context')
      .replace(/Widget create\(/g, 'Widget build(')
      .replace(/backgroundColorColors\./g, 'backgroundColor: Colors.')
      .replace(/StatelessWidet/g, 'StatelessWidget')
      .replace(/Buildectx/g, 'BuildContext ctx')
      .replace(/MyAppextendsStatelessWidet/g, 'MyApp extends StatelessWidget')
      .replace(/MyAppextends StatelessWidget/g, 'MyApp extends StatelessWidget')
      .replace(/@overridewidgetcreate/gi, '@override\n  Widget build')
      .replace(/returnMaterialApplcation/g, 'return MaterialApp')
      .replace(/homepage\(\)/g, 'HomePage()')
      .replace(/import'package/g, "import 'package")
      .replace(/notifyListners/g, 'notifyListeners')  // 오타 수정
      .replace(/appBar:title:/g, 'appBar: AppBar(title: Text(')
      .replace(/appBar\s*:\s*title\s*:\s*"([^"]+)"/g, 'appBar: AppBar(title: Text("$1"))')
      .replace(/\.\.+/g, '.')  // 중복 마침표
      .replace(/違い점/g, '차이점')  // 일본어 제거
      .replace(/\s+\./g, '.');  // 마침표 앞 공백 제거

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

    // 6. 길이 제한 (더 충분한 응답 허용)
    if (answer.length > 1500) {
      const lastCodeEnd = answer.lastIndexOf('```', 1500);
      if (lastCodeEnd > 400) {
        answer = answer.substring(0, lastCodeEnd + 3);
      } else {
        answer = answer.substring(0, 1500);
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
