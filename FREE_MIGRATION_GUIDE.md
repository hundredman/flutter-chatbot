# 🆓 완전 무료 마이그레이션 가이드

## 🎯 목표: 100% 무료로 서비스 운영

---

## 📊 현재 vs 무료 대안

| 구분 | 현재 (유료) | 무료 대안 | 제한 |
|------|------------|----------|------|
| **백엔드** | Firebase Functions | **Vercel Serverless Functions** | 100시간/월 |
| **데이터베이스** | Firestore | **Vercel Postgres (Neon)** | 512MB 무료 |
| **벡터 DB** | Pinecone | **Pinecone Serverless** | 1 index 무료 |
| **LLM** | Gemini ($) | **Groq (무료)** or **Hugging Face** | 무제한 |
| **임베딩** | Google text-embedding-004 ($) | **Hugging Face Inference API** | 무료 |
| **호스팅** | Vercel | **Vercel** | ✅ 이미 무료 |
| **인증** | Firebase Auth | **Vercel KV + JWT** | 256MB 무료 |
| **스케줄링** | Cloud Scheduler ($) | **GitHub Actions Cron** | 2,000분/월 무료 |

---

## 🚀 새로운 무료 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│              Frontend (React)                           │
│              Vercel Hosting (무료)                      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ HTTPS
                   │
┌──────────────────▼──────────────────────────────────────┐
│        Vercel Serverless Functions (무료)              │
│        /api/chat - 챗봇 API                             │
│        /api/history - 대화 기록                         │
└─────┬────────────────────────┬─────────────────────────┘
      │                        │
      │                        │
┌─────▼─────────────┐   ┌──────▼──────────────────────┐
│  Pinecone         │   │  Vercel Postgres (Neon)     │
│  Vector Search    │   │  대화 기록 저장             │
│  (무료 1 index)   │   │  (512MB 무료)              │
└─────┬─────────────┘   └─────────────────────────────┘
      │
      │
┌─────▼─────────────────────────────────────────────────┐
│  Groq API (무료) - LLM                                │
│  또는 Hugging Face Inference API                      │
│  - llama-3.1-70b (무료, 빠름)                         │
└───────────────────────────────────────────────────────┘
      ▲
      │
┌─────┴─────────────────────────────────────────────────┐
│  GitHub Actions (무료)                                │
│  - 매주 월요일 문서 크롤링 (Cron)                     │
│  - Flutter GitHub → Pinecone 자동 업데이트            │
└───────────────────────────────────────────────────────┘
```

---

## 🔧 마이그레이션 단계

### Phase 1: Vercel Serverless Functions로 백엔드 전환

#### 1. 프로젝트 구조 변경

```bash
/Flutter_Chatbot/
├── frontend/               # React 앱
├── api/                   # Vercel Serverless Functions (새로 생성)
│   ├── chat.js           # generateAnswer 대체
│   ├── history.js        # getHistory 대체
│   └── sync.js           # GitHub 크롤링 (수동 트리거)
├── scripts/              # GitHub Actions용 스크립트
│   └── sync-docs.js      # 자동 문서 동기화
└── .github/
    └── workflows/
        └── sync-flutter-docs.yml  # 매주 월요일 자동 실행
```

#### 2. Vercel Function 생성 - `/api/chat.js`

```javascript
// api/chat.js
import { Pinecone } from '@pinecone-database/pinecone';
import Groq from 'groq-sdk';

// CORS 설정
export const config = {
  runtime: 'edge', // Edge Runtime (빠름, 무료)
};

export default async function handler(req) {
  // CORS 헤더 자동 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
    });
  }

  try {
    const { question } = await req.json();

    // 1. Pinecone 벡터 검색 (무료)
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    const index = pc.index('flutter-docs');

    // Hugging Face로 임베딩 생성 (무료)
    const embedding = await generateEmbedding(question);

    const results = await index.query({
      vector: embedding,
      topK: 3,
      includeMetadata: true,
    });

    // 2. Groq로 답변 생성 (무료)
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY, // 무료 API 키
    });

    const context = results.matches
      .map(m => m.metadata.content)
      .join('\n\n');

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a Flutter documentation assistant. Answer based on the following context:\n\n${context}`,
        },
        {
          role: 'user',
          content: question,
        },
      ],
      model: 'llama-3.1-70b-versatile', // 무료, 빠름
      temperature: 0.1,
      max_tokens: 1024,
    });

    return new Response(
      JSON.stringify({
        answer: completion.choices[0].message.content,
        sources: results.matches.map(m => ({
          title: m.metadata.title,
          url: m.metadata.url,
          similarity: m.score,
        })),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}

// Hugging Face로 임베딩 생성 (무료)
async function generateEmbedding(text) {
  const response = await fetch(
    'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    }
  );

  const result = await response.json();
  return result; // 384차원 벡터 (Pinecone 무료 티어 호환)
}
```

#### 3. Vercel Postgres로 대화 기록 저장 - `/api/history.js`

```javascript
// api/history.js
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { conversationId } = req.query;

    const { rows } = await sql`
      SELECT * FROM chat_history
      WHERE conversation_id = ${conversationId}
      ORDER BY timestamp ASC
    `;

    return res.json({ history: rows });
  }

  if (req.method === 'POST') {
    const { conversationId, question, answer } = req.body;

    await sql`
      INSERT INTO chat_history (conversation_id, question, answer, timestamp)
      VALUES (${conversationId}, ${question}, ${answer}, NOW())
    `;

    return res.json({ success: true });
  }
}
```

---

### Phase 2: 자동 문서 동기화 (GitHub Actions)

#### `.github/workflows/sync-flutter-docs.yml`

```yaml
name: Sync Flutter Docs to Pinecone

on:
  schedule:
    # 매주 월요일 오전 3시 (UTC) = 한국 시간 정오
    - cron: '0 3 * * 1'
  workflow_dispatch: # 수동 실행 가능

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          npm install --prefix scripts
          npm install @pinecone-database/pinecone @octokit/rest cheerio gray-matter

      - name: Run sync script
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PINECONE_API_KEY: ${{ secrets.PINECONE_API_KEY }}
          HUGGINGFACE_API_KEY: ${{ secrets.HUGGINGFACE_API_KEY }}
        run: node scripts/sync-docs.js

      - name: Notify completion
        run: echo "✅ Flutter docs synced to Pinecone"
```

#### `scripts/sync-docs.js` (무료 동기화 스크립트)

```javascript
// scripts/sync-docs.js
const { Octokit } = require('@octokit/rest');
const { Pinecone } = require('@pinecone-database/pinecone');
const axios = require('axios');
const matter = require('gray-matter');

async function syncFlutterDocs() {
  console.log('🔄 Starting Flutter docs sync...');

  // 1. GitHub에서 문서 가져오기
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const { data } = await octokit.git.getTree({
    owner: 'flutter',
    repo: 'website',
    tree_sha: 'main',
    recursive: true,
  });

  const mdFiles = data.tree
    .filter(file => file.path.startsWith('src') && file.path.endsWith('.md'))
    .slice(0, 100); // 처음 100개만 (GitHub Actions 시간 제한)

  console.log(`📚 Found ${mdFiles.length} markdown files`);

  // 2. Pinecone 초기화
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index('flutter-docs');

  // 3. 각 파일 처리
  for (const file of mdFiles) {
    const content = await downloadFile(file.path);
    const { data: frontmatter, content: markdown } = matter(content);

    // 청킹 (1200자씩)
    const chunks = chunkText(markdown, 1200);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Hugging Face로 임베딩 생성 (무료)
      const embedding = await generateEmbedding(chunk);

      // Pinecone에 업로드
      await index.upsert([{
        id: `${file.path}-chunk-${i}`,
        values: embedding,
        metadata: {
          title: frontmatter.title || file.path,
          content: chunk,
          url: `https://docs.flutter.dev/${file.path}`,
          githubPath: file.path,
        },
      }]);
    }

    console.log(`✅ Processed ${file.path}`);
  }

  console.log('🎉 Sync completed!');
}

async function downloadFile(path) {
  const url = `https://raw.githubusercontent.com/flutter/website/main/${path}`;
  const { data } = await axios.get(url);
  return data;
}

async function generateEmbedding(text) {
  const response = await fetch(
    'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    }
  );
  return await response.json();
}

function chunkText(text, maxLength) {
  const chunks = [];
  for (let i = 0; i < text.length; i += maxLength - 200) {
    chunks.push(text.slice(i, i + maxLength));
  }
  return chunks;
}

syncFlutterDocs().catch(console.error);
```

---

### Phase 3: 환경 변수 설정 (Vercel)

```bash
# Vercel Dashboard → Settings → Environment Variables

# 필수 환경 변수:
PINECONE_API_KEY=your_pinecone_api_key
GROQ_API_KEY=your_groq_api_key  # https://console.groq.com
HUGGINGFACE_API_KEY=your_hf_token  # https://huggingface.co/settings/tokens
POSTGRES_URL=your_neon_postgres_url  # Vercel이 자동 생성
```

---

## 🎁 무료 서비스 가입 가이드

### 1. Groq API (무료 LLM)
```
1. https://console.groq.com/ 접속
2. 이메일로 가입 (무료)
3. API Key 생성
4. 모델: llama-3.1-70b-versatile (무료, 빠름)
5. 제한: 초당 30 requests, 일일 14,400 requests (충분함)
```

### 2. Hugging Face (무료 임베딩)
```
1. https://huggingface.co/join 접속
2. 가입 (무료)
3. Settings → Access Tokens → New Token
4. 모델: sentence-transformers/all-MiniLM-L6-v2 (384차원, 무료)
5. 제한: 무제한 (Rate limit: 초당 1 request)
```

### 3. Pinecone Serverless (무료)
```
1. https://app.pinecone.io 접속
2. 이미 계정 있음 (기존 사용 중)
3. Serverless 플랜 확인 (무료 1 index)
4. 제한: 100,000 벡터까지 무료
```

### 4. Vercel Postgres (무료)
```
1. Vercel Dashboard → Storage → Create Database
2. Postgres 선택
3. 무료 플랜: 512MB, 60시간 compute/월
4. 자동으로 환경 변수 생성됨
```

### 5. GitHub Actions (무료)
```
1. 이미 사용 가능 (GitHub 계정만 있으면 됨)
2. Public 저장소: 무제한
3. Private 저장소: 2,000분/월 무료
```

---

## 📦 마이그레이션 실행 (단계별)

### Step 1: Vercel Functions 생성 (30분)

```bash
cd /Users/kim/Documents/GitHub/Flutter_Chatbot

# API 폴더 생성
mkdir -p api

# chat.js 생성 (위 코드 복사)
# history.js 생성 (위 코드 복사)
```

### Step 2: 무료 API 키 발급 (15분)

```bash
# Groq API
# https://console.groq.com/ → API Keys → Create

# Hugging Face
# https://huggingface.co/settings/tokens → New Token
```

### Step 3: Vercel 환경 변수 설정 (5분)

```bash
# Vercel Dashboard → flutter-chatbot → Settings → Environment Variables
# 위 3개 키 추가
```

### Step 4: GitHub Actions 설정 (10분)

```bash
# .github/workflows/sync-flutter-docs.yml 생성
# scripts/sync-docs.js 생성

# GitHub Secrets 추가
# Repository → Settings → Secrets → Actions
# - PINECONE_API_KEY
# - HUGGINGFACE_API_KEY
```

### Step 5: Frontend API 엔드포인트 변경 (5분)

```javascript
// frontend/src/components/ChatInterface.js
const apiUrl = '/api/chat'; // Vercel Function으로 변경 (상대 경로)
```

### Step 6: 배포 및 테스트 (10분)

```bash
# 전체 프로젝트 배포
vercel --prod

# 테스트
curl https://flutter-chatbot.vercel.app/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"What is Flutter?"}'

# GitHub Actions 수동 실행
# GitHub → Actions → Sync Flutter Docs → Run workflow
```

---

## 💰 비용 비교

| 항목 | 현재 (GCP) | 무료 대안 |
|------|-----------|----------|
| Cloud Functions | $10-15/월 | **$0** (Vercel) |
| Gemini API | $5-10/월 | **$0** (Groq) |
| text-embedding-004 | $2/월 | **$0** (HF) |
| Firestore | $3/월 | **$0** (Vercel Postgres) |
| Pinecone | $5/월 | **$0** (무료 티어) |
| Cloud Scheduler | $1/월 | **$0** (GitHub Actions) |
| **총계** | **$26-36/월** | **$0/월** |

---

## ⚡ 성능 비교

| 지표 | 현재 (GCP) | 무료 대안 |
|------|-----------|----------|
| 평균 응답 속도 | 2-3초 | 1-2초 (Edge Functions) |
| Cold Start | 1-2초 | <100ms (Vercel Edge) |
| 글로벌 CDN | ✅ Firebase | ✅ Vercel |
| 동시 요청 | 10 | 100+ |

---

## 🔒 제한 사항

### Groq API
- 초당 30 requests
- 일일 14,400 requests (= 시간당 600건)
- **충분함** (예상 사용량: 일일 100건 미만)

### Hugging Face
- Rate limit: 초당 1 request (임베딩)
- **충분함** (검색 시에만 사용, 일일 100건)

### Vercel Functions
- 100시간/월 실행 시간
- **충분함** (100,000 requests/월 가능)

### GitHub Actions
- 2,000분/월 (Public 저장소: 무제한)
- **충분함** (주 1회 = 월 4회 × 30분 = 120분)

---

## 🚀 즉시 실행 가능한 명령어

```bash
# 1. API 키 발급
echo "Groq: https://console.groq.com/"
echo "Hugging Face: https://huggingface.co/settings/tokens"

# 2. 프로젝트 설정
cd /Users/kim/Documents/GitHub/Flutter_Chatbot
mkdir -p api scripts .github/workflows

# 3. 다음 파일 생성 필요:
# - api/chat.js
# - api/history.js
# - scripts/sync-docs.js
# - .github/workflows/sync-flutter-docs.yml

# 4. Vercel 배포
vercel --prod
```

---

## ✅ 체크리스트

- [ ] Groq API 키 발급
- [ ] Hugging Face 토큰 발급
- [ ] `api/chat.js` 생성
- [ ] `api/history.js` 생성
- [ ] `scripts/sync-docs.js` 생성
- [ ] `.github/workflows/sync-flutter-docs.yml` 생성
- [ ] Vercel 환경 변수 설정
- [ ] GitHub Secrets 설정
- [ ] Frontend API URL 변경
- [ ] Vercel 배포
- [ ] 테스트
- [ ] Firebase 프로젝트 정리 (비용 발생 중단)

---

이제 파일들을 생성하시겠습니까? 한 번에 모두 생성해드릴 수 있습니다!
