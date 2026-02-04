# Flutter AI Chatbot (100% Free)

Flutter 개발을 배우는 학생들을 위한 AI 기반 학습 플랫폼입니다. RAG (Retrieval-Augmented Generation) 기술로 Flutter 공식 문서를 학습하고 질문에 답변합니다.

**Monthly Cost: $0 (완전 무료)**

## Live Demo

- **Frontend**: [https://hi-project-flutter-chatbot.web.app](https://hi-project-flutter-chatbot.web.app)
- **API**: [https://flutter-chatbot.vercel.app](https://flutter-chatbot.vercel.app)

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
| **LLM** | Groq (Llama 3.3 70B) | $0 |
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

## 프로젝트 업데이트 절차

코드 변경 후 프로젝트를 업데이트하는 절차는 변경된 부분에 따라 다릅니다.

### 1. 프론트엔드 (React 앱) 업데이트

프론트엔드 코드를 수정한 경우:

```bash
cd frontend
npm install # 의존성 변경이 있는 경우
npm run build # 최신 코드로 빌드
firebase deploy --only hosting # Firebase Hosting에 배포
```

### 2. 백엔드 API (`supabase-backend`) 업데이트

백엔드 API 코드를 수정한 경우:

```bash
cd supabase-backend
npm install # 의존성 변경이 있는 경우
# Vercel은 Git 연동 시 자동으로 배포되므로, 변경사항을 Git에 Push하는 것만으로 충분합니다.
# 수동 배포가 필요한 경우
vercel --prod # Vercel에 배포
```

### 3. 문서 동기화 스크립트 (`sync-docs.js`) 업데이트

`supabase-backend/sync-docs.js` 파일 자체를 수정한 경우:

1.  수정된 코드를 Git에 Push합니다.
2.  `supabase-backend`의 Vercel 배포가 자동으로 업데이트됩니다.
3.  필요한 경우 GitHub Actions의 "Actions" 탭에서 "Sync Flutter Docs to Supabase" 워크플로우를 수동으로 트리거하여 즉시 동기화를 실행할 수 있습니다. (주간 스케줄에 따라 자동 실행됩니다.)

```bash
# 수동 트리거 (GitHub Actions 'Run workflow' 버튼)
```

### 4. 전체 프로젝트 업데이트 (모든 구성요소 변경 시)

여러 구성요소(프론트엔드, 백엔드, 동기화 스크립트 등)에 변경 사항이 있는 경우, 일반적으로 다음 순서로 업데이트하는 것을 권장합니다.

1.  **백엔드 API 업데이트**: `supabase-backend` 변경사항을 Git에 Push하고 Vercel 배포가 완료될 때까지 기다립니다.
2.  **문서 동기화 스크립트 업데이트**: `sync-docs.js` 변경사항을 Git에 Push하고 Vercel 배포가 완료될 때까지 기다립니다. (백엔드 API에 포함되므로 2단계와 동일할 수 있음)
3.  **프론트엔드 업데이트**: `frontend` 변경사항을 빌드하고 Firebase Hosting에 배포합니다.
4.  **필요한 경우 문서 재동기화**: GitHub Actions에서 `Sync Flutter Docs to Supabase` 워크플로우를 수동으로 실행하거나 다음 스케줄을 기다립니다.

## License

MIT License

---

**Made with love for Flutter learners**
