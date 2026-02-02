# Flutter AI Chatbot (100% Free)

Flutter 개발을 배우는 학생들을 위한 AI 기반 학습 플랫폼입니다. RAG (Retrieval-Augmented Generation) 기술로 Flutter 공식 문서를 학습하고 질문에 답변합니다.

**Monthly Cost: $0 (완전 무료)**

## Live Demo

- **Frontend**: [https://hi-project-flutter-chatbot.web.app](https://hi-project-flutter-chatbot.web.app)
- **API**: [https://supabase-backend-green.vercel.app](https://supabase-backend-green.vercel.app)

## Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│              Frontend (Firebase Hosting)                │
│         React 19 + Vite + Firebase Auth                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (Vercel)                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Express.js API Server                          │    │
│  │     - /api/chat (RAG Pipeline)                  │    │
│  │     - /api/health (Status)                      │    │
│  └─────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────────┐   ┌───────────────────┐
│  Supabase         │   │  Gemini API       │
│  (pgvector)       │   │  (Google AI)      │
│  - 3,700+ docs    │   │  - Embeddings     │
│  - Vector search  │   │  - LLM Chat       │
└───────────────────┘   └───────────────────┘
```

| Category | Technology | Cost |
|----------|-----------|------|
| **Frontend** | React 19 + Vite | $0 |
| **Hosting** | Firebase Hosting | $0 |
| **Backend** | Vercel Serverless | $0 |
| **Vector DB** | Supabase pgvector | $0 |
| **LLM** | Gemini 2.0 Flash | $0 |
| **Embeddings** | Gemini text-embedding-004 | $0 |
| **Auth** | Firebase Auth | $0 |
| **Chat Storage** | Firestore | $0 |

## Project Structure

```
Flutter_Chatbot/
├── frontend/                 # React 웹 앱
│   ├── src/
│   │   ├── components/       # React 컴포넌트
│   │   ├── firebase/         # Firebase 설정
│   │   └── i18n/             # 다국어 지원
│   └── .env                  # 환경변수
│
├── supabase-backend/         # Vercel API 서버
│   ├── index.js              # Express API
│   ├── sync-docs.js          # 증분 문서 동기화
│   ├── init-hashes.js        # SHA 해시 초기화
│   ├── setup.sql             # pgvector 설정
│   └── security-fix.sql      # RLS 보안 강화
│
├── .github/workflows/        # GitHub Actions
│   └── sync-docs.yml         # 주간 자동 동기화
│
└── _archived/                # 이전 버전 코드
```

## Features

- **AI Chatbot**: Flutter 공식 문서 기반 질의응답
- **RAG System**: 3,700+ 문서 청크로 학습된 벡터 검색
- **Multi-language**: 한국어/영어 자동 전환
- **30 Flutter Tips**: 랜덤 학습 팁 제공
- **Firebase Auth**: Google 로그인 지원
- **Chat History**: 대화 기록 자동 저장

## Setup

### 1. Supabase 설정

1. [Supabase](https://supabase.com) 프로젝트 생성
2. SQL Editor에서 `setup.sql` 실행
3. SQL Editor에서 `security-fix.sql` 실행

### 2. Vercel 배포

```bash
cd supabase-backend
npm install
vercel login
vercel --prod
```

환경변수 설정:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`

### 3. 문서 동기화

```bash
# 최초 동기화
npm run sync -- --full

# SHA 해시 등록 (증분 동기화 준비)
npm run init-hashes

# 이후 증분 동기화
npm run sync
```

### 4. Frontend 배포

```bash
cd frontend
npm install
npm run build
firebase deploy --only hosting
```

## API Endpoints

### Chat API
```bash
POST /api/chat
{
  "question": "What is Flutter?",
  "language": "ko"
}

Response:
{
  "success": true,
  "answer": "Flutter는 Google이 개발한...",
  "sources": [...],
  "confidence": 0.89
}
```

### Health Check
```bash
GET /api/health

Response:
{
  "status": "ok",
  "service": "Flutter Chatbot Supabase"
}
```

## Auto Sync (GitHub Actions)

매주 월요일 오전 9시(KST) 자동으로 Flutter 문서를 동기화합니다.

**GitHub Secrets 필요**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`

## License

MIT License

---

**Made with love for Flutter learners**
