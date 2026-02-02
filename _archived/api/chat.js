// Vercel Serverless Function for Chat
// 완전 무료: Vercel + Groq + Pinecone + Hugging Face

import { Pinecone } from '@pinecone-database/pinecone';

export const config = {
  runtime: 'edge', // Edge Runtime으로 빠른 응답
};

export default async function handler(req) {
  // CORS 처리
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const { question, language = 'en' } = await req.json();

    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Processing question: "${question}"`);

    // 1. Hugging Face로 임베딩 생성 (무료)
    const embedding = await generateEmbedding(question);

    // 2. Pinecone에서 유사 문서 검색 (무료)
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    const index = pc.index('flutter-docs');

    const results = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    console.log(`Found ${results.matches.length} similar documents`);

    // 3. Groq로 답변 생성 (무료)
    const context = results.matches
      .map((match, i) => `[Source ${i + 1}] ${match.metadata.title}
URL: ${match.metadata.url}
Content: ${match.metadata.content}
---`)
      .join('\n\n');

    const languageInstructions = {
      ko: 'IMPORTANT: You MUST respond in Korean (한국어). 모든 답변은 반드시 한국어로 작성해야 합니다.',
      en: 'Respond in English.',
    };

    const prompt = `You are a helpful Flutter development assistant. Answer the user's question based on the provided Flutter documentation context.

${languageInstructions[language] || languageInstructions.en}

Context from Flutter documentation:
${context}

Question: ${question}

Instructions:
1. Answer based on the provided context
2. Include code examples when relevant
3. Cite sources using [Source X] notation
4. Be concise but thorough
5. If the context doesn't fully answer the question, acknowledge it`;

    const answer = await generateAnswer(prompt);

    // 4. 응답 반환
    return new Response(
      JSON.stringify({
        success: true,
        answer: answer,
        sources: results.matches.map(match => ({
          title: match.metadata.title,
          url: match.metadata.url,
          similarity: match.score,
        })),
        confidence: results.matches[0]?.score || 0,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

// Hugging Face Inference API로 임베딩 생성 (무료)
async function generateEmbedding(text) {
  const response = await fetch(
    'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.statusText}`);
  }

  const embedding = await response.json();
  return embedding;
}

// Groq API로 답변 생성 (무료)
async function generateAnswer(prompt) {
  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile', // 무료, 빠름
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2048,
        top_p: 0.8,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
