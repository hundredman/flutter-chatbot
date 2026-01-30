# Flutter AI Chatbot (100% Free)

Flutter 개발을 배우는 학생들을 위한 AI 기반 학습 플랫폼입니다. RAG (Retrieval-Augmented Generation) 기술로 Flutter 공식 문서를 학습하고 질문에 답변합니다.

**💰 월 비용**: $0 (완전 무료, 영구 지속 가능)

## 🎯 Live Demo

- **Production**: [https://flutter-chatbot-ten.vercel.app](https://flutter-chatbot-ten.vercel.app)
- **Worker API**: [https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev](https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev)

## ⭐ 주요 특징

- 🤖 **AI 챗봇**: Flutter 공식 문서 기반 실시간 질의응답
- 📚 **RAG 시스템**: 32개 공식 문서로 학습된 지능형 검색
- 🌍 **다국어 지원**: 한국어/영어 자동 전환
- 💡 **30개 Flutter 팁**: 랜덤 학습 팁 제공
- 🔐 **Firebase 인증**: Google 로그인 지원
- 💬 **대화 기록**: 자동 저장 및 관리
- ⚡ **초고속 응답**: Cloudflare Edge Network

## 🚀 Tech Stack (100% 무료)

### 완전 통합 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (Vercel)                  │
│  React 19 + Vite + Firebase Auth + Firestore           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Cloudflare Workers (Edge)                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🤖 Workers AI (LLM + Embeddings)              │   │
│  │     - Llama 3.1 8B Instruct                    │   │
│  │     - BGE Base EN v1.5                         │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🔍 Vectorize (Vector Database)                │   │
│  │     - 32 Flutter 공식 문서                      │   │
│  │     - 768-dim embeddings                        │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  💾 D1 Database (SQL)                          │   │
│  │     - Chat history (optional)                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 기술 스택 상세

| Category | Technology | Cost | Why? |
|----------|-----------|------|------|
| **Frontend** | React 19 + Vite | $0 | 빠른 빌드, 모던 개발 환경 |
| **Hosting** | Vercel | $0 | 자동 배포, CDN, 무제한 대역폭 |
| **Backend** | Cloudflare Workers | $0 | 전 세계 300+ 엣지, 무료 10만 요청/일 |
| **LLM** | Llama 3.1 8B (Workers AI) | $0 | 내장 모델, API 키 불필요 |
| **Embeddings** | BGE Base (Workers AI) | $0 | 내장 모델, API 키 불필요 |
| **Vector DB** | Cloudflare Vectorize | $0 | 통합 벡터 검색, 무료 3000만 쿼리/월 |
| **Database** | D1 + Firestore | $0 | D1 무료 100k rows, Firestore 무료 tier |
| **Auth** | Firebase Auth | $0 | Google 로그인, 무제한 사용자 |

### 왜 Cloudflare인가?

1. ✅ **완전 통합**: LLM + Embeddings + Vector DB + SQL이 모두 Workers 내장
2. ✅ **0개 API 키**: 외부 서비스 의존성 제로
3. ✅ **초고속**: 전 세계 300+ 엣지에서 실행 (<50ms latency)
4. ✅ **유지보수 쉬움**: 하나의 대시보드, 하나의 코드베이스
5. ✅ **100% 무료**: $0/월, 과금 위험 0%, 신용카드 불필요

## 📁 Project Structure

```
Flutter_Chatbot/
├── frontend/                      # React 프론트엔드 (Vercel)
│   ├── src/
│   │   ├── components/            # React 컴포넌트
│   │   │   ├── AuthPage.jsx       # 로그인 페이지
│   │   │   ├── ChatInterface.jsx  # 채팅 인터페이스
│   │   │   ├── ChatLayout.jsx     # 메인 레이아웃
│   │   │   ├── HomePage.jsx       # 홈페이지 (30개 팁)
│   │   │   ├── MessageBubble.jsx  # 메시지 UI
│   │   │   └── Sidebar.jsx        # 사이드바
│   │   ├── firebase/              # Firebase 설정
│   │   │   ├── config.js          # Firebase 초기화
│   │   │   ├── authService.js     # 인증 서비스
│   │   │   └── chatService.js     # 채팅 저장
│   │   ├── i18n/                  # 다국어 지원
│   │   │   └── translations.js    # 한국어/영어
│   │   ├── App.jsx
│   │   └── index.jsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── cloudflare-worker/             # Cloudflare Workers 백엔드
│   ├── src/
│   │   └── index.js               # 통합 Worker (RAG 파이프라인)
│   ├── scripts/
│   │   ├── sync-flutter-docs.js   # Flutter 문서 크롤러
│   │   └── test-vectorize.js      # 테스트 데이터 삽입
│   ├── wrangler.toml              # Worker 설정
│   ├── package.json
│   └── .env.example
│
├── .gitignore
├── README.md
└── LICENSE
```

## 🔧 Setup & Deployment

### Prerequisites

- Node.js 18+
- Cloudflare 계정 (무료)
- Vercel 계정 (무료)
- Firebase 프로젝트 (무료 tier)

### 1. Cloudflare Worker 설정

```bash
# Worker 디렉토리로 이동
cd cloudflare-worker

# 의존성 설치
npm install

# Wrangler 로그인
npx wrangler login

# D1 데이터베이스 생성
npx wrangler d1 create flutter-chatbot-db

# Vectorize 인덱스 생성
npx wrangler vectorize create flutter-docs --dimensions=768 --metric=cosine

# wrangler.toml 파일 업데이트 (위 명령어 출력에서 ID 복사)
# [[d1_databases]]
# database_id = "your-database-id"
# [[vectorize]]
# index_name = "flutter-docs"

# Worker 배포
npm run deploy
```

### 2. Flutter 문서 동기화

```bash
# 32개 공식 문서를 Vectorize에 삽입
cd cloudflare-worker
node scripts/sync-flutter-docs.js
```

성공하면 다음과 같이 출력됩니다:
```
✅ Fetched 32 documents successfully!
📤 Syncing 32 documents to Vectorize...
✅ Batch 1: Synced 5 documents
...
✅ Sync completed!
```

### 3. Frontend 설정

```bash
# Frontend 디렉토리로 이동
cd frontend

# 의존성 설치
npm install

# .env 파일 생성 (.env.example 참고)
cp .env.example .env

# 환경 변수 설정
# VITE_CLOUDFLARE_WORKER_URL=https://your-worker.workers.dev
# VITE_FIREBASE_API_KEY=your-api-key
# VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
# VITE_FIREBASE_PROJECT_ID=your-project-id
# VITE_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
# VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
# VITE_FIREBASE_APP_ID=your-app-id

# 로컬 개발 서버 실행
npm run dev
```

### 4. Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 프로젝트 배포
vercel --prod

# Vercel 대시보드에서 환경 변수 설정:
# Settings → Environment Variables
# - VITE_CLOUDFLARE_WORKER_URL
# - VITE_FIREBASE_* (모든 Firebase 변수)
# 주의: Production, Preview, Development 모두 체크!

# 재배포 (환경 변수 적용)
vercel --prod
```

### 5. 자동 문서 동기화 설정

프로젝트는 GitHub Actions를 통해 **매주 일요일 자동으로 Flutter 문서를 업데이트**합니다.

**자동 동기화:**
- **주기**: 매주 일요일 오전 3시 (UTC)
- **방법**: GitHub Actions (`.github/workflows/sync-flutter-docs.yml`)
- **무료**: Public 저장소는 GitHub Actions 무료

**수동 동기화:**
```bash
# 로컬에서 수동 실행
cd cloudflare-worker
node scripts/sync-flutter-docs.js

# GitHub Actions 수동 트리거
# GitHub 저장소 → Actions → Sync Flutter Documentation → Run workflow
```

**동기화 확인:**
```bash
# 데이터가 제대로 들어갔는지 확인
curl -X POST https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"What is Flutter?","language":"ko"}'
```

## 📊 API Endpoints

### 1. Chat API
```bash
POST https://your-worker.workers.dev/api/chat
Content-Type: application/json

{
  "question": "What is Flutter?",
  "language": "ko",
  "conversationId": "conv-123"
}

# Response
{
  "answer": "Flutter는 Google이 개발한...",
  "sources": [
    {
      "title": "What is Flutter?",
      "url": "https://docs.flutter.dev/",
      "similarity": 0.89
    }
  ],
  "confidence": 0.89
}
```

### 2. Health Check
```bash
GET https://your-worker.workers.dev/api/health

# Response
{
  "status": "ok",
  "service": "Flutter Chatbot Worker",
  "cost": "$0/month (100% free)"
}
```

### 3. Test Data Insert
```bash
POST https://your-worker.workers.dev/api/test-insert

# Response
{
  "success": true,
  "message": "Inserted 5 test documents",
  "documents": ["What is Flutter?", "Getting Started", ...]
}
```

## 🎨 Features

### 1. RAG Pipeline
```
User Question
    ↓
[임베딩 생성] Workers AI (BGE Base)
    ↓
[벡터 검색] Vectorize (Top 5 유사 문서)
    ↓
[컨텍스트 구성] 문서 + 질문 결합
    ↓
[답변 생성] Workers AI (Llama 3.1 8B)
    ↓
User Response (한국어/영어)
```

### 2. Document Sync
- 32개 Flutter 공식 문서 자동 크롤링
- HTML → Markdown → 8000자 청크로 분할
- 임베딩 생성 및 Vectorize 저장
- 메타데이터: title, content, url, type, fetchedAt
- **자동 업데이트**: 매주 일요일 자동 동기화 (GitHub Actions)

### 3. Chat History
- Firestore에 대화 저장
- 대화방별 메시지 관리
- 자동 제목 생성
- 검색 및 필터링

## 🔐 Security

- ✅ `.env` 파일은 Git에서 제외됨
- ✅ Firebase Security Rules 적용
- ✅ CORS 설정 완료
- ✅ 환경 변수를 통한 민감 정보 관리

## 📈 Performance

| Metric | Value |
|--------|-------|
| **Cold Start** | <100ms |
| **Warm Response** | <50ms |
| **Embedding Generation** | ~200ms |
| **Vector Search** | ~50ms |
| **LLM Generation** | ~500ms |
| **Total Response Time** | ~800ms |

## 💰 Cost Breakdown

| Service | Usage | Free Tier | Cost |
|---------|-------|-----------|------|
| Cloudflare Workers | 100 req/day | 100,000 req/day | $0 |
| Workers AI (LLM) | 100 req/day | 10,000 req/day | $0 |
| Workers AI (Embeddings) | 100 req/day | 10,000 req/day | $0 |
| Vectorize | 100 queries/day | 30M queries/month | $0 |
| D1 Database | 100 writes/day | 100k rows stored | $0 |
| Vercel Hosting | Unlimited | Unlimited bandwidth | $0 |
| Firebase Auth | 100 users | Unlimited users | $0 |
| Firestore | 100 docs/day | 50k reads/day | $0 |
| **Total** | | | **$0/month** |

## 🚀 Roadmap

- [ ] 더 많은 Flutter 문서 추가 (현재 32개 → 100개+)
- [ ] 코드 예제 실행 기능
- [ ] 멀티모달 지원 (이미지, 다이어그램)
- [ ] 학습 진도 추적 시스템
- [ ] 커뮤니티 Q&A 기능
- [ ] 모바일 앱 (React Native)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- [Flutter](https://flutter.dev) - Official Flutter Documentation
- [Cloudflare Workers](https://workers.cloudflare.com) - Edge Computing Platform
- [Firebase](https://firebase.google.com) - Authentication & Database
- [Vercel](https://vercel.com) - Frontend Hosting
- [React](https://react.dev) - UI Framework

---

**Made with ❤️ for Flutter learners**

**💰 Total Cost: $0/month (100% Free Forever)**
