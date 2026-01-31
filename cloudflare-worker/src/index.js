/**
 * Flutter Chatbot - Cloudflare Worker
 * 100% 무료 통합 백엔드
 * - Workers AI (LLM, 임베딩)
 * - Vectorize (벡터 검색)
 * - D1 Database (대화 기록)
 */

export default {
  async fetch(request, env, ctx) {
    // CORS 헤더
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
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
 * AI Provider: Cloudflare Workers AI
 */
async function callCloudflareAI(messages, env) {
  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages,
    max_tokens: 512,
    temperature: 0.4,
    repetition_penalty: 1.3,
    frequency_penalty: 0.7,
  });
  return response.response || 'No response generated';
}

/**
 * AI Provider: Groq (무료 14,400 요청/일)
 */
async function callGroqAI(messages, env) {
  if (!env.GROQ_API_KEY) {
    throw new Error('Groq API key not configured');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 512,
      temperature: 0.5,
      top_p: 0.9,
      frequency_penalty: 0.6,
      presence_penalty: 0.4,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 512,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Multi-Provider AI with Fallback Chain
 * Priority: Groq → Cloudflare → Gemini
 * (Groq has more powerful 70B model vs Cloudflare's 8B)
 */
async function callAIWithFallback(messages, env) {
  const providers = [
    { name: 'Groq', call: callGroqAI },
    { name: 'Cloudflare Workers AI', call: callCloudflareAI },
    { name: 'Gemini', call: callGeminiAI },
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
      topK: 5,
      returnValues: false,
      returnMetadata: 'all',
    });

    console.log(`Found ${results.matches.length} similar documents`);

    // 3. 컨텍스트 구성
    const context = results.matches
      .map((match, i) => {
        const metadata = match.metadata || {};
        return `[Source ${i + 1}] ${metadata.title || 'Flutter Documentation'}
URL: ${metadata.url || ''}
Content: ${metadata.content || ''}
---`;
      })
      .join('\n\n');

    // 4. LLM 답변 생성 (Workers AI - 무료)
    console.log('Generating answer with LLM...');

    const languageInstructions = {
      ko: 'IMPORTANT: You MUST respond in Korean (한국어). 모든 답변은 반드시 한국어로 작성해야 합니다.',
      en: 'Respond in English.',
    };

    const systemPrompt = `You are a helpful Flutter development assistant. Answer the user's question based on the provided Flutter documentation context.

${languageInstructions[language] || languageInstructions.en}

Context from Flutter documentation:
${context}

CRITICAL Instructions - Follow these strictly:
1. Answer based ONLY on the provided context above - if the context doesn't contain enough information, say so clearly
2. Keep your answer SHORT and FOCUSED (2-3 short paragraphs, 100-150 words total)
3. Write NATURALLY and COHERENTLY:
   - Use proper sentences with correct grammar
   - Do NOT generate gibberish, broken text, or random characters
   - Do NOT repeat the same phrase or sentence multiple times
   - If you find yourself repeating, STOP immediately
4. Use markdown for code examples when appropriate
5. DO NOT include [Source X] citations in your answer
6. DO NOT make long lists - prefer concise prose
7. Quality over quantity - a short, clear answer is better than a long, repetitive one`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ];

    // Multi-Provider AI with automatic fallback
    const { answer: rawAnswer, provider } = await callAIWithFallback(messages, env);
    console.log(`📊 Used provider: ${provider}`);

    // Clean up double line breaks (reduce spacing)
    const answer = rawAnswer ? rawAnswer.replace(/\n\n+/g, '\n') : rawAnswer;

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
