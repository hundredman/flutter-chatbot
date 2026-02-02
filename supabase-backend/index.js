/**
 * Flutter Chatbot - Supabase + Gemini Backend
 * pgvector for vector search, Gemini for embeddings & chat
 */

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Gemini 임베딩 생성 (768차원)
 */
async function getGeminiEmbedding(text) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
      {
        model: 'models/text-embedding-004',
        content: { parts: [{ text: text.substring(0, 8000) }] }
      },
      { timeout: 30000 }
    );
    return response.data.embedding.values;
  } catch (error) {
    console.error('Gemini embedding error:', error.message);
    return null;
  }
}

/**
 * Groq Chat 호출 (LLM)
 */
async function callGroqChat(messages) {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: 0.3,
      max_tokens: 1500,
    },
    {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    }
  );

  return response.data.choices[0].message.content;
}

/**
 * Gemini Chat 호출 (fallback)
 */
async function callGeminiChat(messages) {
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents,
      generationConfig: {
        temperature: 0.3,
        topP: 0.85,
        maxOutputTokens: 1500,
      },
    },
    { timeout: 60000 }
  );

  return response.data.candidates[0].content.parts[0].text;
}

/**
 * 채팅 API
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { question, language = 'ko' } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    console.log(`Processing: "${question}"`);

    // 1. 쿼리 임베딩 생성
    const queryVector = await getGeminiEmbedding(question);

    let sources = [];
    let context = '';

    if (queryVector) {
      // 2. pgvector로 유사도 검색
      const { data: results, error } = await supabase.rpc('match_documents', {
        query_embedding: queryVector,
        match_threshold: 0.3,
        match_count: 5
      });

      if (!error && results) {
        console.log(`Found ${results.length} similar documents`);

        sources = results.map(r => ({
          title: r.title || 'Flutter Documentation',
          url: r.url || '',
          similarity: r.similarity,
        }));

        context = results
          .map(r => `[${r.title}]\n${r.content}`)
          .join('\n\n');
      }
    }

    // 3. LLM 호출
    const systemPrompt = language === 'ko'
      ? `당신은 Flutter 전문가입니다. 다음 문서를 참고하여 질문에 답변하세요.
- 정확하고 실용적인 답변을 제공하세요
- 필요하면 코드 예제를 포함하세요
- 마크다운 형식으로 답변하세요

참고 문서:
${context || '(관련 문서 없음 - 일반 지식으로 답변)'}`
      : `You are a Flutter expert. Answer based on the following documents.
- Provide accurate and practical answers
- Include code examples if needed
- Use markdown format

Reference documents:
${context || '(No relevant documents - answer from general knowledge)'}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ];

    // Groq 우선, 실패시 Gemini fallback
    let answer;
    try {
      answer = await callGroqChat(messages);
      console.log('LLM: Groq');
    } catch (groqError) {
      console.log('Groq failed, trying Gemini:', groqError.message);
      const geminiMessages = [
        { role: 'user', content: `${systemPrompt}\n\n질문: ${question}` }
      ];
      answer = await callGeminiChat(geminiMessages);
      console.log('LLM: Gemini (fallback)');
    }

    res.json({
      success: true,
      answer,
      sources,
      confidence: sources.length > 0 ? sources[0].similarity : 0.5,
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
});

/**
 * 벡터 동기화 API
 */
app.post('/api/sync-vectors', async (req, res) => {
  try {
    const { vectors } = req.body;

    if (!vectors || !Array.isArray(vectors)) {
      return res.status(400).json({ error: 'vectors array required' });
    }

    let count = 0;
    for (const vector of vectors) {
      if (vector.id && vector.values) {
        const { error } = await supabase
          .from('documents')
          .upsert({
            id: vector.id,
            embedding: vector.values,
            title: vector.metadata?.title || '',
            content: vector.metadata?.content || '',
            url: vector.metadata?.url || '',
            doc_type: vector.metadata?.type || 'flutter-docs',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (!error) count++;
      }
    }

    console.log(`Synced ${count} vectors`);
    res.json({ success: true, synced: count });

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message, success: false });
  }
});

/**
 * 헬스체크
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Flutter Chatbot Supabase',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
