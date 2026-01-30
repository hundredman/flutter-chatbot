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

Instructions:
1. Answer based ONLY on the provided context above
2. Be CONCISE and avoid repetition - do not repeat the same information multiple times
3. Structure your answer with clear paragraphs (use double line breaks between sections)
4. Include code examples when relevant
5. At the end, cite sources using [Source X] notation in a separate line
6. If the context doesn't fully answer the question, acknowledge it
7. Keep your answer focused and to the point - quality over quantity`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ];

    // Llama 3.1 8B 모델 사용 (무료)
    const llmResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: messages,
      max_tokens: 2048,
      temperature: 0.1,
    });

    const answer = llmResponse.response || 'No response generated';

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
    return Response.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500, headers: corsHeaders }
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
