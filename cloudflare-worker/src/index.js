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

    // 질문 유형 감지
    const isExplanationQuestion = /뭔가요|무엇인가요|뭐야|뭐예요|무엇이야|무엇인지|뭔데|뭐지|뭐임|뭔지|알려줘|설명해|어떻게\s*작동|차이점|차이가|비교|사용법|사용방법|what\s*is|what'?s|explain|how\s*to\s*use|how\s*does/i.test(question);
    const isCodeExampleRequest = /코드\s*예제|예제\s*코드|샘플\s*코드|code\s*example|sample\s*code|구현\s*예제/i.test(question);

    // 맥락 없는 질문 감지 (이전 대화 참조)
    const isContextlessQuestion = /^(다음|이전|위|아래|그|이|저)\s*(단계|것|거|내용|코드)?\s*(추천|알려|보여|해줘|줘|뭐야|뭔가요)?[?]?$/i.test(question.trim()) ||
                                   /^(추천|다음)\s*(해줘|해주세요|부탁)?[?]?$/i.test(question.trim()) ||
                                   /^.{2,10}\s*(후에는|다음에는|하고\s*나서는?|끝나면|완료\s*후)[?]?$/i.test(question.trim()) ||
                                   /^.{2,10}\s*후에\s*(뭐|무엇|어떻게)[?해]?[?]?$/i.test(question.trim()) ||  // "인증 후에 뭐해?"
                                   /^(그러면|그럼|그래서|그\s*다음|그\s*후)[?]?$/i.test(question.trim()) ||
                                   // 영어 맥락 없는 질문
                                   /^(what'?s?\s*)?next[?]?$/i.test(question.trim()) ||
                                   /^(and\s*)?(then|now)\s*(what)?[?]?$/i.test(question.trim()) ||
                                   /^what\s*(should\s*i\s*do\s*)?(after\s*that|now)[?]?$/i.test(question.trim()) ||
                                   /^(continue|go\s*on|proceed)[?]?$/i.test(question.trim());

    // 주요 토픽별 공식 문서 링크 + 설명 (구체적인 패턴이 먼저 와야 함!)
    // 형식: { url, what, how } - what은 정의/개념, how는 사용법
    const docLinks = {
      // Firebase 관련 - 구체적인 것 먼저
      'firebaseauth|firebase\\s*auth|파이어베이스\\s*인증': {
        url: 'https://firebase.flutter.dev/docs/auth/overview',
        what: 'Firebase Authentication은 사용자 인증을 처리하는 Firebase 서비스입니다. 이메일/비밀번호, Google, Facebook, Apple, 익명 로그인 등 다양한 인증 방식을 제공하며, 사용자 세션과 토큰을 자동으로 관리합니다.',
        how: '1) pubspec.yaml에 firebase_auth 추가 2) Firebase 콘솔에서 인증 방식 활성화 3) FirebaseAuth.instance로 signIn/signOut 호출 4) authStateChanges()로 로그인 상태 감시',
      },
      'firestore|파이어스토어|파이어\\s*스토어': {
        url: 'https://firebase.flutter.dev/docs/firestore/overview',
        what: 'Cloud Firestore는 Firebase의 실시간 NoSQL 클라우드 데이터베이스입니다. 문서-컬렉션 구조로 데이터를 저장하고, 여러 기기 간 실시간 동기화와 오프라인 지원을 제공합니다.',
        how: '1) pubspec.yaml에 cloud_firestore 추가 2) FirebaseFirestore.instance로 접근 3) collection().doc().set()/get()으로 CRUD 4) snapshots()로 실시간 리스닝',
      },
      'firebase\\s*storage|파이어베이스\\s*스토리지': {
        url: 'https://firebase.flutter.dev/docs/storage/overview',
        desc: 'Firebase Storage는 이미지, 동영상, 파일 등을 클라우드에 저장합니다. 업로드/다운로드 진행률 추적과 보안 규칙 설정이 가능합니다.',
      },
      'firebase\\s*messaging|fcm|푸시\\s*알림': {
        url: 'https://firebase.flutter.dev/docs/messaging/overview',
        desc: 'Firebase Cloud Messaging(FCM)으로 푸시 알림을 전송합니다. 백그라운드/포그라운드 메시지 처리, 토픽 구독, 알림 커스터마이징을 지원합니다.',
      },
      'crashlytics|크래시리틱스': {
        url: 'https://firebase.flutter.dev/docs/crashlytics/overview',
        desc: 'Firebase Crashlytics는 앱 크래시를 실시간으로 추적합니다. 스택 트레이스, 기기 정보, 사용자 경로를 수집하여 버그 수정을 돕습니다.',
      },
      'analytics|애널리틱스|분석': {
        url: 'https://firebase.flutter.dev/docs/analytics/overview',
        desc: 'Firebase Analytics로 사용자 행동을 분석합니다. 이벤트 로깅, 사용자 속성, 전환 추적 등을 통해 앱 사용 패턴을 파악할 수 있습니다.',
      },
      'firebase|파이어베이스': {
        url: 'https://firebase.flutter.dev/docs/overview',
        desc: 'Firebase는 앱 개발을 위한 통합 플랫폼입니다. 인증, 데이터베이스, 스토리지, 푸시 알림, 분석 등 다양한 백엔드 서비스를 제공합니다.',
      },

      // 상태 관리
      'riverpod|리버팟|리버\\s*팟': {
        url: 'https://riverpod.dev/docs/introduction/getting_started',
        what: 'Riverpod은 Provider의 개선된 버전으로, 컴파일 타임 안전성과 테스트 용이성이 뛰어난 상태 관리 라이브러리입니다. BuildContext 없이도 상태에 접근 가능하며, 의존성 주입도 지원합니다.',
        how: '1) pubspec.yaml에 flutter_riverpod 추가 2) Provider 정의 (StateProvider, FutureProvider 등) 3) ProviderScope로 앱 감싸기 4) ref.watch/read로 상태 접근',
      },
      'provider|프로바이더': {
        url: 'https://pub.dev/packages/provider',
        what: 'Provider는 Flutter 공식 권장 상태 관리 라이브러리입니다. InheritedWidget을 감싸서 위젯 트리 전체에서 상태를 쉽게 공유하고 접근할 수 있게 합니다. 간단하면서도 확장성이 좋습니다.',
        how: '1) pubspec.yaml에 provider 추가 2) ChangeNotifier 클래스 생성 3) ChangeNotifierProvider로 앱 감싸기 4) context.watch/read로 상태 접근 5) notifyListeners()로 UI 업데이트',
      },
      'bloc|블록|블락': {
        url: 'https://bloclibrary.dev/#/gettingstarted',
        desc: 'BLoC 패턴은 비즈니스 로직을 UI와 분리합니다. 이벤트를 받아 상태를 변환하는 방식으로, 테스트와 유지보수가 용이합니다.',
      },
      'getx|겟엑스|get\\s*x': {
        url: 'https://pub.dev/packages/get',
        desc: 'GetX는 상태 관리, 라우팅, 의존성 주입을 제공하는 경량 프레임워크입니다. 적은 보일러플레이트로 빠른 개발이 가능합니다.',
      },
      'mobx|몹엑스': {
        url: 'https://pub.dev/packages/mobx',
        desc: 'MobX는 반응형 상태 관리 라이브러리입니다. Observable 상태와 자동 UI 업데이트로 선언적인 코드 작성이 가능합니다.',
      },
      'redux|리덕스': {
        url: 'https://pub.dev/packages/flutter_redux',
        desc: 'Redux는 단방향 데이터 흐름의 상태 관리 패턴입니다. 예측 가능한 상태 변화와 시간 여행 디버깅을 지원합니다.',
      },
      'state\\s*management|상태\\s*관리': {
        url: 'https://docs.flutter.dev/data-and-backend/state-mgmt',
        desc: 'Flutter 상태 관리는 위젯 간 데이터 공유 방법입니다. setState, Provider, Riverpod, BLoC 등 다양한 옵션이 있으며, 앱 규모에 따라 선택합니다.',
      },
      'setstate|set\\s*state': {
        url: 'https://docs.flutter.dev/data-and-backend/state-mgmt/ephemeral-vs-app',
        desc: 'setState는 StatefulWidget의 기본 상태 관리 방법입니다. 로컬 UI 상태에 적합하며, 호출 시 build()가 다시 실행됩니다.',
      },

      // UI/레이아웃
      'hero\\s*animation|히어로\\s*애니메이션': {
        url: 'https://docs.flutter.dev/ui/animations/hero-animations',
        desc: 'Hero 애니메이션은 화면 전환 시 공유 요소가 자연스럽게 이동하는 효과입니다. 같은 tag를 가진 Hero 위젯 간에 자동으로 애니메이션됩니다.',
      },
      'implicit\\s*animation|암시적\\s*애니메이션': {
        url: 'https://docs.flutter.dev/ui/animations/implicit-animations',
        desc: '암시적 애니메이션은 AnimatedContainer, AnimatedOpacity 등으로 속성 변경 시 자동 애니메이션됩니다. 간단한 애니메이션에 적합합니다.',
      },
      'animation|애니메이션': {
        url: 'https://docs.flutter.dev/ui/animations',
        desc: 'Flutter 애니메이션은 암시적(Animated 위젯)과 명시적(AnimationController) 방식이 있습니다. Tween, Curve로 다양한 효과를 구현합니다.',
      },
      'named\\s*route|네임드\\s*라우트': {
        url: 'https://docs.flutter.dev/cookbook/navigation/named-routes',
        desc: 'Named Routes는 문자열 이름으로 화면을 식별합니다. MaterialApp의 routes에 등록하고 Navigator.pushNamed()로 이동합니다.',
      },
      'go\\s*router|고\\s*라우터': {
        url: 'https://pub.dev/packages/go_router',
        desc: 'GoRouter는 선언적 라우팅 패키지입니다. URL 기반 네비게이션, 딥링크, 리다이렉트, 중첩 라우트를 지원합니다.',
      },
      'navigation|네비게이션|라우팅|라우트|페이지\\s*이동': {
        url: 'https://docs.flutter.dev/ui/navigation',
        what: 'Flutter Navigation은 화면 전환을 관리하는 시스템입니다. Navigator가 화면을 스택처럼 관리하며, push로 새 화면 추가, pop으로 이전 화면 복귀합니다. 데이터 전달과 반환도 가능합니다.',
        how: '1) Navigator.push()로 새 화면 이동 2) Navigator.pop()으로 뒤로가기 3) MaterialPageRoute로 화면 전환 애니메이션 4) arguments로 데이터 전달 5) Named Routes로 경로 관리',
      },
      'bottom\\s*nav|바텀\\s*네비게이션|하단\\s*탭': {
        url: 'https://api.flutter.dev/flutter/material/BottomNavigationBar-class.html',
        desc: 'BottomNavigationBar는 하단 탭 네비게이션입니다. 3-5개 메인 화면 전환에 적합하며, currentIndex로 선택 상태를 관리합니다.',
      },
      'tab\\s*bar|탭\\s*바|탭바': {
        url: 'https://docs.flutter.dev/cookbook/design/tabs',
        desc: 'TabBar는 상단 탭 네비게이션입니다. TabController와 TabBarView를 함께 사용하여 스와이프 전환을 구현합니다.',
      },
      'drawer|드로어|사이드\\s*메뉴': {
        url: 'https://docs.flutter.dev/cookbook/design/drawer',
        desc: 'Drawer는 측면에서 슬라이드되는 메뉴입니다. Scaffold의 drawer 속성에 추가하고, ListTile로 메뉴 항목을 구성합니다.',
      },
      'appbar|앱바|앱\\s*바': {
        url: 'https://api.flutter.dev/flutter/material/AppBar-class.html',
        desc: 'AppBar는 화면 상단 앱 바입니다. title, leading, actions로 구성하며, SliverAppBar로 스크롤 효과를 추가할 수 있습니다.',
      },
      'scaffold|스캐폴드': {
        url: 'https://api.flutter.dev/flutter/material/Scaffold-class.html',
        desc: 'Scaffold는 Material Design 기본 레이아웃입니다. AppBar, Drawer, FloatingActionButton, BottomNavigationBar 등을 배치합니다.',
      },
      'listview|리스트뷰|리스트\\s*뷰|목록': {
        url: 'https://docs.flutter.dev/cookbook/lists',
        what: 'ListView는 스크롤 가능한 목록을 표시하는 Flutter 위젯입니다. 세로 또는 가로 방향으로 여러 항목을 나열하며, builder를 사용하면 대량 데이터도 효율적으로 렌더링합니다.',
        how: '1) ListView()로 기본 목록 생성 2) ListView.builder()로 대량 데이터 처리 3) itemCount와 itemBuilder 설정 4) ListTile로 항목 구성 5) Divider로 구분선 추가',
      },
      'gridview|그리드뷰|그리드\\s*뷰|격자': {
        url: 'https://api.flutter.dev/flutter/widgets/GridView-class.html',
        desc: 'GridView는 2차원 격자 레이아웃입니다. GridView.count나 GridView.builder로 구성하며, 갤러리나 상품 목록에 적합합니다.',
      },
      'column|row|컬럼|로우|열|행': {
        url: 'https://docs.flutter.dev/ui/layout',
        desc: 'Column은 세로, Row는 가로로 자식을 배치합니다. mainAxisAlignment와 crossAxisAlignment로 정렬을 조절합니다.',
      },
      'stack|스택|겹치기': {
        url: 'https://api.flutter.dev/flutter/widgets/Stack-class.html',
        desc: 'Stack은 위젯을 겹쳐서 배치합니다. Positioned로 자식 위치를 지정하며, 오버레이나 배지 구현에 사용합니다.',
      },
      'container|컨테이너': {
        url: 'https://api.flutter.dev/flutter/widgets/Container-class.html',
        desc: 'Container는 장식, 패딩, 마진, 크기를 적용하는 기본 위젯입니다. decoration으로 배경색, 테두리, 그림자를 추가합니다.',
      },
      'padding|margin|패딩|마진|여백': {
        url: 'https://docs.flutter.dev/ui/layout',
        desc: 'Padding은 내부 여백, margin은 외부 여백입니다. EdgeInsets.all(), symmetric(), only()로 방향별 여백을 지정합니다.',
      },
      'sizedbox|sized\\s*box': {
        url: 'https://api.flutter.dev/flutter/widgets/SizedBox-class.html',
        desc: 'SizedBox는 고정 크기 박스입니다. 위젯 간 간격이나 특정 크기 지정에 사용하며, SizedBox.expand()로 최대 크기를 채웁니다.',
      },
      'expanded|flexible|확장': {
        url: 'https://docs.flutter.dev/ui/layout/constraints',
        desc: 'Expanded는 남은 공간을 채우고, Flexible은 비율로 공간을 나눕니다. flex 값으로 비율을 조절합니다.',
      },
      'form|폼|입력\\s*폼|텍스트\\s*필드': {
        url: 'https://docs.flutter.dev/cookbook/forms',
        desc: 'Form은 TextFormField를 감싸 유효성 검사를 관리합니다. GlobalKey<FormState>로 validate(), save(), reset()을 호출합니다.',
      },
      'button|버튼': {
        url: 'https://docs.flutter.dev/ui/widgets/material#buttons',
        desc: 'ElevatedButton, TextButton, OutlinedButton, IconButton 등이 있습니다. onPressed 콜백으로 탭 이벤트를 처리합니다.',
      },
      'text|텍스트|글자': {
        url: 'https://api.flutter.dev/flutter/widgets/Text-class.html',
        desc: 'Text 위젯으로 텍스트를 표시합니다. TextStyle로 폰트, 크기, 색상을 지정하고, RichText로 부분 스타일링이 가능합니다.',
      },
      'image|이미지|사진\\s*표시': {
        url: 'https://docs.flutter.dev/ui/assets/images',
        desc: 'Image.asset()은 로컬, Image.network()는 URL 이미지를 표시합니다. fit으로 크기 조절, CachedNetworkImage로 캐싱합니다.',
      },
      'icon|아이콘': {
        url: 'https://api.flutter.dev/flutter/widgets/Icon-class.html',
        desc: 'Icon 위젯은 Material Icons를 표시합니다. Icons 클래스에서 아이콘을 선택하고, size와 color로 스타일링합니다.',
      },
      'dialog|다이얼로그|팝업|모달': {
        url: 'https://docs.flutter.dev/cookbook/design/dialogs',
        desc: 'showDialog()로 AlertDialog를 표시합니다. title, content, actions로 구성하며, Navigator.pop()으로 닫습니다.',
      },
      'snackbar|스낵바|토스트': {
        url: 'https://docs.flutter.dev/cookbook/design/snackbars',
        desc: 'ScaffoldMessenger.of(context).showSnackBar()로 하단 메시지를 표시합니다. action으로 버튼을 추가할 수 있습니다.',
      },
      'theme|테마|다크\\s*모드': {
        url: 'https://docs.flutter.dev/cookbook/design/themes',
        desc: 'MaterialApp의 theme과 darkTheme으로 앱 테마를 정의합니다. ThemeData로 색상, 폰트, 위젯 스타일을 통일합니다.',
      },

      // 네트워킹/데이터
      'http\\s*요청|api\\s*call|api\\s*호출|fetch\\s*data|rest\\s*api': {
        url: 'https://docs.flutter.dev/cookbook/networking/fetch-data',
        desc: 'http 패키지로 GET/POST 요청을 보냅니다. async/await로 비동기 처리하고, FutureBuilder로 UI에 결과를 표시합니다.',
      },
      'dio|디오': {
        url: 'https://pub.dev/packages/dio',
        desc: 'Dio는 강력한 HTTP 클라이언트입니다. 인터셉터, 취소, 파일 업로드, FormData 등 고급 기능을 제공합니다.',
      },
      'json|제이슨|파싱': {
        url: 'https://docs.flutter.dev/data-and-backend/serialization/json',
        desc: 'jsonDecode()로 JSON을 Map으로 변환합니다. factory 생성자나 json_serializable로 모델 클래스와 매핑합니다.',
      },
      'sqlite|sqflite|로컬\\s*db|로컬\\s*데이터베이스': {
        url: 'https://docs.flutter.dev/cookbook/persistence/sqlite',
        desc: 'sqflite는 로컬 SQLite 데이터베이스입니다. 테이블 생성, CRUD 쿼리를 지원하며, 오프라인 데이터 저장에 적합합니다.',
      },
      'hive|하이브': {
        url: 'https://pub.dev/packages/hive',
        desc: 'Hive는 빠른 NoSQL 로컬 데이터베이스입니다. Key-Value 저장소로, 간단한 데이터 캐싱에 적합합니다.',
      },
      'shared\\s*pref|sharedpreferences|로컬\\s*저장': {
        url: 'https://pub.dev/packages/shared_preferences',
        desc: 'SharedPreferences는 간단한 Key-Value 저장소입니다. 설정값, 토큰 등 작은 데이터를 영구 저장합니다.',
      },
      'websocket|웹소켓|실시간': {
        url: 'https://docs.flutter.dev/cookbook/networking/web-sockets',
        desc: 'WebSocket은 실시간 양방향 통신입니다. 채팅, 실시간 알림 등에 사용하며, StreamBuilder로 메시지를 처리합니다.',
      },

      // 기기 기능
      'camera|카메라|사진\\s*찍': {
        url: 'https://pub.dev/packages/camera',
        desc: 'camera 패키지로 카메라 미리보기와 촬영을 구현합니다. 전/후면 카메라 전환, 플래시, 줌 조절이 가능합니다.',
      },
      'image\\s*picker|이미지\\s*선택|갤러리\\s*선택': {
        url: 'https://pub.dev/packages/image_picker',
        desc: 'image_picker로 갤러리에서 이미지를 선택하거나 카메라로 촬영합니다. 이미지 크기와 품질을 조절할 수 있습니다.',
      },
      'file\\s*picker|파일\\s*선택': {
        url: 'https://pub.dev/packages/file_picker',
        desc: 'file_picker로 문서, 이미지 등 파일을 선택합니다. 다중 선택과 파일 타입 필터링을 지원합니다.',
      },
      'permission|권한|퍼미션': {
        url: 'https://pub.dev/packages/permission_handler',
        desc: 'permission_handler로 카메라, 위치, 저장소 등 권한을 요청합니다. 권한 상태 확인과 설정 화면 이동을 지원합니다.',
      },
      'location|위치|gps': {
        url: 'https://pub.dev/packages/geolocator',
        desc: 'geolocator로 현재 위치를 가져옵니다. 좌표, 속도, 고도 정보와 위치 변경 스트림을 제공합니다.',
      },
      'notification|알림': {
        url: 'https://firebase.flutter.dev/docs/messaging/overview',
        desc: 'Firebase Cloud Messaging으로 푸시 알림을 구현합니다. 토큰 등록, 메시지 수신, 알림 탭 처리를 지원합니다.',
      },
      'local\\s*notification|로컬\\s*알림': {
        url: 'https://pub.dev/packages/flutter_local_notifications',
        desc: 'flutter_local_notifications로 로컬 알림을 예약합니다. 반복 알림, 커스텀 소리, 액션 버튼을 지원합니다.',
      },
      'biometric|생체\\s*인증|지문|face\\s*id': {
        url: 'https://pub.dev/packages/local_auth',
        desc: 'local_auth로 지문, Face ID 인증을 구현합니다. 생체 인증 가능 여부 확인 후 인증을 요청합니다.',
      },
      'qr\\s*code|큐알|바코드': {
        url: 'https://pub.dev/packages/qr_code_scanner',
        desc: 'qr_code_scanner로 QR 코드와 바코드를 스캔합니다. 카메라 미리보기에서 실시간으로 인식합니다.',
      },
      'bluetooth|블루투스': {
        url: 'https://pub.dev/packages/flutter_blue_plus',
        desc: 'flutter_blue_plus로 BLE 기기와 통신합니다. 스캔, 연결, 서비스/특성 읽기/쓰기를 지원합니다.',
      },
      'share|공유하기': {
        url: 'https://pub.dev/packages/share_plus',
        desc: 'share_plus로 텍스트, 파일을 다른 앱과 공유합니다. 시스템 공유 시트를 표시합니다.',
      },
      'url\\s*launcher|url\\s*열기|링크\\s*열기': {
        url: 'https://pub.dev/packages/url_launcher',
        desc: 'url_launcher로 웹 URL, 전화, 이메일, 지도를 엽니다. canLaunchUrl()로 가능 여부를 먼저 확인합니다.',
      },
      'webview|웹뷰': {
        url: 'https://pub.dev/packages/webview_flutter',
        desc: 'webview_flutter로 앱 내 웹페이지를 표시합니다. JavaScript 통신, 네비게이션 제어, 쿠키 관리를 지원합니다.',
      },

      // 테스트/디버깅
      'test|테스트|유닛\\s*테스트': {
        url: 'https://docs.flutter.dev/testing/overview',
        desc: 'Flutter 테스트는 Unit, Widget, Integration 테스트로 구분됩니다. test() 함수와 expect()로 검증합니다.',
      },
      'widget\\s*test|위젯\\s*테스트': {
        url: 'https://docs.flutter.dev/cookbook/testing/widget/introduction',
        desc: 'Widget 테스트는 UI 컴포넌트를 검증합니다. testWidgets()와 WidgetTester로 탭, 입력 등을 시뮬레이션합니다.',
      },
      'integration\\s*test|통합\\s*테스트': {
        url: 'https://docs.flutter.dev/testing/integration-tests',
        desc: 'Integration 테스트는 실제 기기에서 전체 앱을 테스트합니다. 사용자 시나리오를 자동화하여 검증합니다.',
      },
      'debug|디버그|디버깅': {
        url: 'https://docs.flutter.dev/testing/debugging',
        desc: 'Flutter DevTools로 UI 검사, 성능 프로파일링, 네트워크 모니터링을 합니다. debugPrint()로 로그를 출력합니다.',
      },
      'devtools|개발자\\s*도구': {
        url: 'https://docs.flutter.dev/tools/devtools/overview',
        desc: 'Flutter DevTools는 위젯 인스펙터, 타임라인, 메모리, 네트워크 탭을 제공합니다. 브라우저에서 실행됩니다.',
      },

      // 배포
      'android\\s*release|안드로이드\\s*배포|플레이\\s*스토어': {
        url: 'https://docs.flutter.dev/deployment/android',
        desc: 'Android 배포는 서명된 APK/AAB를 생성합니다. keystore 생성, gradle 설정, 버전 관리 후 Play Console에 업로드합니다.',
      },
      'ios\\s*release|ios\\s*배포|앱\\s*스토어': {
        url: 'https://docs.flutter.dev/deployment/ios',
        desc: 'iOS 배포는 Archive를 생성하여 App Store Connect에 업로드합니다. 인증서, 프로비저닝 프로파일 설정이 필요합니다.',
      },
      'web\\s*deploy|웹\\s*배포': {
        url: 'https://docs.flutter.dev/deployment/web',
        desc: 'flutter build web으로 정적 파일을 생성합니다. Firebase Hosting, GitHub Pages 등에 배포할 수 있습니다.',
      },
      'release|배포|빌드': {
        url: 'https://docs.flutter.dev/deployment',
        desc: 'flutter build로 릴리즈 빌드를 생성합니다. 플랫폼별로 서명, 난독화, 최적화 설정을 적용합니다.',
      },

      // 기본/입문
      'flutter\\s*설치|install|시작하기': {
        url: 'https://docs.flutter.dev/get-started/install',
        desc: 'Flutter SDK 설치 후 flutter doctor로 환경을 확인합니다. Android Studio나 VS Code에서 Flutter 확장을 설치합니다.',
      },
      'widget|위젯': {
        url: 'https://docs.flutter.dev/ui/widgets-intro',
        desc: 'Flutter UI는 위젯으로 구성됩니다. 모든 것이 위젯이며, 작은 위젯을 조합하여 복잡한 UI를 만듭니다.',
      },
      'stateless|stateful|상태': {
        url: 'https://docs.flutter.dev/ui/interactivity',
        desc: 'StatelessWidget은 불변, StatefulWidget은 상태 변경이 가능합니다. setState()로 상태를 변경하면 UI가 다시 빌드됩니다.',
      },
      'lifecycle|생명주기|라이프사이클': {
        url: 'https://api.flutter.dev/flutter/widgets/State-class.html',
        desc: 'State 생명주기: initState → build → didUpdateWidget → dispose 순서입니다. 리소스 초기화와 정리에 활용합니다.',
      },
      'pubspec|패키지|의존성': {
        url: 'https://docs.flutter.dev/packages-and-plugins/using-packages',
        desc: 'pubspec.yaml에 dependencies를 추가하고 flutter pub get으로 설치합니다. pub.dev에서 패키지를 검색합니다.',
      },
      'asset|에셋|리소스': {
        url: 'https://docs.flutter.dev/ui/assets/assets-and-images',
        desc: 'pubspec.yaml의 assets에 경로를 등록합니다. Image.asset(), rootBundle로 이미지, 파일을 로드합니다.',
      },
      'font|폰트|글꼴': {
        url: 'https://docs.flutter.dev/cookbook/design/fonts',
        desc: 'pubspec.yaml의 fonts에 폰트 파일을 등록합니다. TextStyle의 fontFamily로 적용하고, GoogleFonts 패키지도 활용 가능합니다.',
      },
      'internationalization|i18n|다국어|번역': {
        url: 'https://docs.flutter.dev/ui/accessibility-and-internationalization/internationalization',
        desc: 'flutter_localizations로 다국어를 지원합니다. ARB 파일에 번역을 정의하고, Localizations.of()로 접근합니다.',
      },

      // 인증 (Firebase 외)
      '인증|로그인\\s*구현|auth': {
        url: 'https://firebase.flutter.dev/docs/auth/overview',
        desc: 'Firebase Authentication은 이메일/비밀번호, 소셜 로그인, 익명 로그인을 지원합니다. 사용자 상태는 authStateChanges()로 감시합니다.',
      },
    };

    // 질문 유형 세분화: "뭔데/뭐야" = 정의 질문, "사용법/방법" = 사용법 질문
    const isDefinitionQuestion = /뭔가요|무엇인가요|뭐야|뭐예요|무엇이야|무엇인지|뭔데|뭐지|뭐임|뭔지|what\s*is|what'?s/i.test(question);
    const isHowToQuestion = /사용법|사용방법|어떻게|방법|설정|연동|how\s*to|how\s*do/i.test(question);

    // 질문에서 관련 문서 링크 찾기
    let relevantDocLink = null;
    let relevantDocDesc = null;
    for (const [pattern, docInfo] of Object.entries(docLinks)) {
      if (new RegExp(pattern, 'i').test(question)) {
        relevantDocLink = docInfo.url;
        // 질문 유형에 따라 다른 설명 선택
        if (isDefinitionQuestion && docInfo.what) {
          relevantDocDesc = docInfo.what;
        } else if (isHowToQuestion && docInfo.how) {
          relevantDocDesc = docInfo.how;
        } else {
          // 기본값: what이 있으면 what, 없으면 desc (하위 호환)
          relevantDocDesc = docInfo.what || docInfo.desc || docInfo.how;
        }
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

    // 맥락 없는 질문 처리 (이전 대화 참조하는 질문)
    if (isContextlessQuestion) {
      console.log('📖 Contextless question detected, returning guidance');

      // 영어/한국어 응답 구분
      const isEnglishQuestion = /^[a-zA-Z\s?'!.,]+$/.test(question.trim());
      const directAnswer = isEnglishQuestion
        ? `I don't have context from previous conversations.

Please ask a specific question:
- **Build an app**: "Create a ToDo app", "Make a calculator app"
- **Concept questions**: "How to use Provider", "What is Navigator"
- **Code requests**: "Login screen code", "ListView example"

What Flutter topic would you like to know about?`
        : `죄송합니다. 이전 대화 내용을 기억하지 못합니다.

구체적으로 질문해주시면 도움드릴 수 있습니다:
- **앱 만들기**: "ToDo 앱 만들어줘", "계산기 앱 만들어줘"
- **개념 질문**: "Provider 사용법", "Navigator 뭔가요"
- **코드 요청**: "로그인 화면 코드", "리스트뷰 예제"

어떤 Flutter 주제가 궁금하신가요?`;

      return Response.json(
        {
          success: true,
          answer: directAnswer,
          sources: [],
          confidence: 1.0,
          provider: 'direct',
        },
        { headers: corsHeaders }
      );
    }

    // 설명 질문일 때: AI 우회하고 직접 응답 생성 (설명 + 링크)
    if (isExplanationQuestion && relevantDocLink) {
      console.log('📖 Explanation question detected, returning doc link directly');

      // 토픽 이름 추출
      const topicMatch = question.match(/(\w+|[가-힣]+)\s*(사용법|사용방법|뭔가요|무엇|설명|what|how|explain)/i);
      const topicName = topicMatch ? topicMatch[1] : 'Flutter';

      // 영어/한국어 응답 구분
      const isEnglishQuestion = /^[a-zA-Z\s?'!.,]+$/.test(question.trim());
      const directAnswer = isEnglishQuestion
        ? `## ${topicName}

${relevantDocDesc || 'A Flutter development component.'}

**Official Documentation:** ${relevantDocLink}

The official docs include installation guides and code examples.`
        : `## ${topicName}

${relevantDocDesc || 'Flutter 개발 컴포넌트입니다.'}

**공식 문서:** ${relevantDocLink}

공식 문서에서 설치 방법과 코드 예제를 확인하세요.`;

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

    // 코드 예제 요청인데 템플릿이 없는 경우: AI 우회하고 공식 문서 안내
    // (AI가 이상한 코드를 생성하는 것 방지)
    if (isCodeExampleRequest && relevantDocLink && !matchedTemplate) {
      console.log('📖 Code example request without template, returning doc link');

      // 토픽 이름 추출
      const topicMatch = question.match(/(\w+|[가-힣]+)\s*(코드\s*예제|예제\s*코드|샘플|code\s*example|sample)/i);
      const topicName = topicMatch ? topicMatch[1] : 'Flutter';

      // 영어/한국어 응답 구분
      const isEnglishQuestion = /^[a-zA-Z\s?'!.,]+$/.test(question.trim());
      const directAnswer = isEnglishQuestion
        ? `## ${topicName} Code Examples

${relevantDocDesc || `Code examples for ${topicName} are available.`}

**Official Documentation:** ${relevantDocLink}

The official docs include installation guides and code examples.`
        : `## ${topicName} 코드 예제

${relevantDocDesc || `${topicName} 관련 코드 예제입니다.`}

**공식 문서:** ${relevantDocLink}

공식 문서에서 설치 방법과 코드 예제를 확인하세요.`;

      return Response.json(
        {
          success: true,
          answer: directAnswer,
          sources: results.matches.slice(0, 3).map((match) => ({
            title: match.metadata?.title || 'Flutter Documentation',
            url: match.metadata?.url || '',
            similarity: match.score || 0,
          })),
          confidence: 0.85,
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

    // 코드 생성이 필요한 요청인지 확인
    const isCodeRequest = /만들어|구현|개발|코드|예제|sample|example|create|build/i.test(question);

    // 코드 요청인데 템플릿이 없고 docLink도 없으면 -> 기본 Flutter 문서 안내
    if (isCodeRequest && !matchedTemplate && !relevantDocLink) {
      console.log('📖 Code request without template/docLink, returning Flutter docs');

      // 벡터 검색에서 관련 문서 URL 찾기
      const relatedDoc = results.matches.find(m => m.metadata?.url);
      const docUrl = relatedDoc?.metadata?.url || 'https://docs.flutter.dev';

      // 영어/한국어 응답 구분
      const isEnglishQuestion = /^[a-zA-Z\s?'!.,]+$/.test(question.trim());
      const directAnswer = isEnglishQuestion
        ? `## Flutter Development Guide

No code template is available for your request.

**Check official documentation:** ${docUrl}

### Suggested questions:
- **App templates**: "Create a ToDo app", "Calculator app", "Login screen"
- **Widget usage**: "How to use ListView", "What is GridView"
- **State management**: "How to use Provider", "What is Riverpod"

Please ask about a specific topic for a more accurate response.`
        : `## Flutter 개발 안내

요청하신 내용에 대한 코드 템플릿이 준비되어 있지 않습니다.

**공식 문서에서 확인하세요:** ${docUrl}

### 추천 질문 예시:
- **앱 템플릿**: "ToDo 앱 만들어줘", "계산기 앱", "로그인 화면"
- **위젯 사용법**: "ListView 사용법", "GridView 뭔가요"
- **상태관리**: "Provider 사용법", "Riverpod 뭔가요"

구체적인 주제로 다시 질문해주시면 더 정확한 답변을 드릴 수 있습니다.`;

      return Response.json(
        {
          success: true,
          answer: directAnswer,
          sources: results.matches.slice(0, 3).map((match) => ({
            title: match.metadata?.title || 'Flutter Documentation',
            url: match.metadata?.url || '',
            similarity: match.score || 0,
          })),
          confidence: 0.7,
          provider: 'direct',
        },
        { headers: corsHeaders }
      );
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

    // 4. LLM 답변 생성 - 코드 생성 금지, 개념 설명만
    console.log('Generating answer with LLM (concept only, no code)...');

    const languageInstructions = {
      ko: 'IMPORTANT: You MUST respond in Korean (한국어). 모든 답변은 반드시 한국어로 작성해야 합니다.',
      en: 'Respond in English.',
    };

    // 모든 AI 응답에서 코드 생성 금지 - 개념 설명만
    const systemPrompt = `You are a Flutter documentation assistant. You explain concepts clearly but DO NOT write code.

${languageInstructions[language] || languageInstructions.en}

Reference:
${context}

CRITICAL RULES:
1. DO NOT write any code blocks (\`\`\`dart or \`\`\`)
2. DO NOT generate Flutter/Dart code
3. DO NOT write pubspec.yaml content
4. ONLY explain concepts in plain text
5. Keep responses concise (3-5 sentences max)
6. End with relevant documentation link if available

RESPONSE FORMAT:
1. Brief explanation of the concept (2-3 sentences)
2. Key points or steps (bullet points)
3. Documentation link: ${relevantDocLink || 'https://docs.flutter.dev'}

NO greetings, NO casual language, NO exclamation marks. Technical content only.`;

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
      /[!]{2,}/g,  // 느낌표 여러 개
      /궁금[증한점]?\s*있으시[면][^.]*[.!]*/gi,
      /문제나\s*궁금[증]?\s*있으실[경우에][^.]*[.!]*/gi,
      /부탁드립니다[!.~]*/gi,
      /따라서\s*이러한\s*이유[들]?때문에[^.]*[.!]*/gi,
      /https?:\/\/[^\s]*[%\u0000-\u001f\u007f-\u009f\uD800-\uDFFF][^\s]*/g,  // 깨진 URL 제거
      /많이\s*이용중이다[!.~]*/gi,
      /https?:\/\/[^\s]*#[^\s]*/g,  // 앵커(#) 포함 URL 제거 (AI가 임의로 생성한 앵커)
      /권환|권限/g,  // AI가 생성하는 이상한 한자 혼합
    ];
    chatPatterns.forEach(pattern => {
      answer = answer.replace(pattern, '');
    });

    // 2. 연속된 코드 블록 합치기
    answer = answer.replace(/```\s*\n+```dart\n/g, '\n');
    answer = answer.replace(/```dart\n+```dart\n/g, '```dart\n');

    // 3. 코드 블록 내 심각한 오류 감지
    const codeBlockMatch = answer.match(/```(?:dart|yaml)?([\s\S]*?)```/);
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
        /Extends\s+stateless/i, // Extends statelesswidget (대소문자 오류)
        /statelesswidget/,      // 소문자 (StatelessWidget이어야 함)
        /statefulwidget/,       // 소문자 (StatefulWidget이어야 함)
        /builddcontext/i,       // builddcontext 오타
        /my\s*app\s*\(/i,       // my app ( 공백 오류
        /scaffold\s*\(\s*appbar\s*:\s*title\s*:/i,  // scaffold(appbar:title: 잘못된 구조
        /sdk\s*path/i,          // sdk path (잘못된 pubspec)
        /\^\s*\+/,              // ^+ (잘못된 버전 형식)
        /\$\{[^}]+\}/,          // ${variable} (해석 안 된 템플릿)
        /path\/to\//i,          // path/to/ (플레이스홀더)
        /dependency_overrides\s*:/i,  // 빈 dependency_overrides
        /environment\s*:\s*\n\s*sdk_path/i,  // 잘못된 environment
      ];
      const hasSevereError = severeErrors.some(p => p.test(codeContent));

      if (hasSevereError) {
        console.log('⚠️ Severe code error detected, removing broken code block');
        // 코드 블록 전 설명만 유지
        const beforeCode = answer.split(/```(?:dart|yaml)?/)[0].trim();
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
