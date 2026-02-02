# Flutter Chatbot - Supabase Backend

Supabase + pgvector + Gemini를 사용한 RAG 챗봇 백엔드

## 설정 방법

### 1. Supabase 프로젝트 생성

1. https://supabase.com 에서 새 프로젝트 생성
2. Project Settings > API에서 URL과 service_role key 복사

### 2. 데이터베이스 설정

Supabase 대시보드 > SQL Editor에서 `setup.sql` 실행

### 3. 환경 변수 설정

```bash
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_KEY="eyJ..."
export GEMINI_API_KEY="AIza..."
```

### 4. 실행

```bash
npm install
npm start
```

### 5. 문서 동기화

```bash
cd ../cloudflare-worker/scripts
SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx GEMINI_API_KEY=xxx node sync-supabase.js
```

## API 엔드포인트

- `POST /api/chat` - 챗봇 질문
- `POST /api/sync-vectors` - 벡터 동기화
- `GET /api/health` - 헬스체크

## 배포

Vercel, Railway, Render 등에 배포 가능
