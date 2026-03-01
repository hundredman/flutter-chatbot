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
- 반드시 한국어로 답변하세요. 중국어나 일본어를 섞지 마세요. 영어 기술 용어는 허용됩니다.
- 정확하고 실용적인 답변을 제공하세요
- 필요하면 코드 예제를 포함하세요
- 마크다운 형식으로 답변하세요

참고 문서:
${context || '(관련 문서 없음 - 일반 지식으로 답변)'}`
      : `You are a Flutter expert. Answer based on the following documents.
- Respond only in English. Do not mix other languages.
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
 * 퀴즈 생성 API
 * 파트의 챕터 목록을 받아 챕터당 3문제씩 객관식 퀴즈를 생성
 */
app.post('/api/quiz', async (req, res) => {
  try {
    const { partId, chapters, language = 'ko' } = req.body;

    if (!partId || !chapters || !Array.isArray(chapters)) {
      return res.status(400).json({ error: 'partId and chapters array required' });
    }

    console.log(`Generating quiz for Part ${partId}, ${chapters.length} chapters`);

    const chaptersText = chapters.map(ch =>
      `챕터 ${ch.id}: ${ch.title} (주요 주제: ${ch.topics.join(', ')})`
    ).join('\n');

    const prompt = language === 'ko'
      ? `다음 Flutter 학습 챕터들에 대한 객관식 퀴즈를 생성해주세요.
각 챕터마다 정확히 3개의 문제를 만들어야 합니다.

챕터 목록:
${chaptersText}

요구사항:
- 각 문제는 Flutter 개념을 정확히 테스트해야 합니다
- 보기는 4개, 정답은 1개
- 오답 보기도 그럴듯하게 만들어주세요 (완전히 엉뚱한 내용 X)
- 반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이)

{
  "questions": [
    {
      "chapterId": 숫자,
      "question": "문제 내용",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "answerIndex": 정답인덱스(0~3),
      "explanation": "정답 설명 (1-2문장)"
    }
  ]
}`
      : `Generate multiple choice quiz questions for the following Flutter learning chapters.
Create exactly 3 questions per chapter.

Chapters:
${chaptersText}

Requirements:
- Each question must accurately test Flutter concepts
- 4 options per question, 1 correct answer
- Make wrong options plausible (not completely unrelated)
- Respond ONLY in the following JSON format (no other text)

{
  "questions": [
    {
      "chapterId": number,
      "question": "question text",
      "options": ["option1", "option2", "option3", "option4"],
      "answerIndex": correctIndex(0~3),
      "explanation": "explanation of the correct answer (1-2 sentences)"
    }
  ]
}`;

    const messages = [
      { role: 'user', content: prompt }
    ];

    let rawAnswer;
    try {
      rawAnswer = await callGroqChat(messages);
    } catch (groqError) {
      console.log('Groq failed, trying Gemini:', groqError.message);
      rawAnswer = await callGeminiChat(messages);
    }

    // JSON 파싱
    const jsonMatch = rawAnswer.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse quiz JSON from LLM response');
    }

    const quizData = JSON.parse(jsonMatch[0]);

    res.json({
      success: true,
      partId,
      questions: quizData.questions,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ error: error.message, success: false });
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
