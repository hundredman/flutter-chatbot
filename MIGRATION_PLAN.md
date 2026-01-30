# 🚨 긴급 마이그레이션 플랜

## 현재 문제 상황

### 1. CORS 오류 (해결 완료 - 배포 대기 중)
- ✅ `generateAnswer.js` - v2 API + 명시적 CORS 헤더 추가
- ✅ `getHistory.js` - v2 API + 명시적 CORS 헤더 추가
- ✅ `mockRAG.js` - v2 API + 명시적 CORS 헤더 추가
- ✅ `mockHistory.js` - v2 API + 명시적 CORS 헤더 추가

### 2. GCP 무료 체험 만료 (해결 필요)
```
Error: Extensions require the Blaze plan
Project: hi-project-flutter-chatbot is not on the Blaze plan
Deadline: 2026년 2월 24일
```

---

## 해결 방안 (3가지 옵션)

## ✅ 옵션 1: GCP Blaze 플랜 업그레이드 (권장)

### 장점
- 기존 인프라 유지 (변경 최소화)
- Pinecone + Gemini + Firebase 그대로 사용
- 자동 스케줄링 유지 (매주 월요일 문서 동기화)

### 비용 예상 (월 기준)
```
Firebase Cloud Functions:
- 무료 티어: 200만 호출, 400,000 GB-seconds/월
- 초과 시: $0.40/100만 호출

Google Gemini 2.5 Flash Lite:
- $0.075 per 1M input tokens (한글 기준 ~500만 글자)
- $0.30 per 1M output tokens (한글 기준 ~500만 글자)
- 예상: 월 1000건 질문 → $5-10

Google text-embedding-004:
- $0.025 per 1M tokens
- 예상: 월 $1-2

Pinecone Serverless:
- 스토리지: $0.4/GB/월 (현재 ~100MB = $0.04)
- 읽기: $0.2/1M 읽기 단위
- 예상: 월 $2-5

Firebase Firestore:
- 50,000 읽기/일 무료
- 예상: 무료 티어 내 사용

총 예상 비용: $10-20/월
```

### 실행 방법
```bash
# 1. GCP 콘솔에서 결제 활성화
https://console.cloud.google.com/billing/linkedaccount?project=hi-project-flutter-chatbot

# 2. Blaze 플랜으로 업그레이드

# 3. Cloud Functions 배포
cd functions
npm run deploy

# 4. 테스트
curl -X POST https://us-central1-hi-project-flutter-chatbot.cloudfunctions.net/generateAnswer \
  -H "Content-Type: application/json" \
  -d '{"question":"What is Flutter?"}'
```

---

## 🔄 옵션 2: 다른 GCP 프로젝트로 마이그레이션 (무료 체험 재사용)

### 장점
- 새 GCP 계정으로 12개월 무료 체험 ($300 크레딧)
- 기술 스택 동일 유지

### 단점
- 데이터 마이그레이션 필요 (Firestore, Pinecone)
- 새 프로젝트 설정 (1-2시간 소요)

### 실행 방법
1. 새 Gmail 계정 생성
2. GCP 무료 체험 시작 (신용카드 필요)
3. Firebase 프로젝트 생성
4. Firestore 데이터 내보내기/가져오기
5. Pinecone 데이터 다시 업로드
6. 환경 변수 업데이트

---

## 🆓 옵션 3: 완전 무료 대안으로 전환 (최대 절약)

### 대안 아키텍처

#### A. Vercel Serverless Functions (백엔드)
```javascript
// api/generateAnswer.js (Vercel Function)
export default async function handler(req, res) {
  // CORS 자동 처리
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Pinecone + Gemini 호출 (클라이언트에서 직접)
  // 또는 Vercel Edge Functions 사용
}
```

**장점**:
- Vercel: 100GB bandwidth/월 무료
- Serverless Functions: 100시간 실행/월 무료
- 자동 HTTPS, CORS 처리

**단점**:
- Cloud Scheduler 사용 불가 (자동 동기화 X)
- Firebase Admin SDK 제한적

#### B. Cloudflare Workers (백엔드 대안)
```javascript
// worker.js
export default {
  async fetch(request) {
    // Pinecone + Gemini API 호출
    // 무료: 100,000 요청/일
  }
}
```

**장점**:
- 완전 무료 (100,000 요청/일)
- 글로벌 엣지 네트워크
- CORS 자동 처리

#### C. Supabase (Firebase 대안)
```
Firestore → Supabase PostgreSQL (500MB 무료)
Firebase Auth → Supabase Auth
Firebase Functions → Supabase Edge Functions
```

**장점**:
- 완전 무료 티어
- PostgreSQL + RESTful API
- Realtime 기능

### 무료 대안 총정리

| 서비스 | 현재 (Firebase) | 무료 대안 | 비용 |
|--------|----------------|----------|------|
| 백엔드 | Cloud Functions | Vercel Functions | $0 |
| 데이터베이스 | Firestore | Supabase | $0 |
| 인증 | Firebase Auth | Supabase Auth | $0 |
| 벡터 DB | Pinecone | Pinecone Serverless | $0 (소량) |
| LLM | Gemini | Groq (무료 tier) | $0 |
| 호스팅 | Vercel | Vercel | $0 |

---

## 📋 실행 체크리스트

### 즉시 실행 (CORS 수정 배포)

**옵션 A: 임시로 GCP 결제 활성화하고 배포**
```bash
# 1. GCP 콘솔에서 Blaze 플랜 활성화
# 2. 배포
cd /Users/kim/Documents/GitHub/Flutter_Chatbot/functions
npm run deploy

# 3. 테스트
curl -X POST https://us-central1-hi-project-flutter-chatbot.cloudfunctions.net/generateAnswer \
  -H "Content-Type: application/json" \
  -H "Origin: https://flutter-chatbot.vercel.app" \
  -d '{"question":"test"}'
```

**옵션 B: Vercel로 빠르게 마이그레이션 (2시간 작업)**
```bash
# 1. Vercel 프로젝트에 API 폴더 생성
mkdir -p api

# 2. generateAnswer를 Vercel Function으로 변환
# api/generateAnswer.js 생성

# 3. 환경 변수 설정
# Vercel Dashboard → Settings → Environment Variables
# - PINECONE_API_KEY
# - GOOGLE_API_KEY (Gemini)

# 4. 배포
vercel --prod
```

---

## 💰 비용 최적화 팁

### Cloud Functions 비용 절감
```javascript
// 1. 메모리 최적화
exports.generateAnswer = onRequest({
  memory: "256MiB",  // 512MiB → 256MiB로 줄이기
  timeoutSeconds: 60, // 300초 → 60초로 줄이기
})

// 2. Cold start 최소화
exports.generateAnswer = onRequest({
  minInstances: 0,  // 항상 0으로 유지 (cold start 발생)
  maxInstances: 3,  // 최대 3개로 제한
})
```

### Gemini 비용 절감
```javascript
// 프롬프트 최적화
const prompt = `Answer in 100 words or less.`; // 짧은 답변 유도

// 컨텍스트 크기 제한
const context = relevantDocs.slice(0, 3); // 5개 → 3개
```

### Pinecone 비용 절감
```javascript
// 검색 결과 수 줄이기
const results = await searchPinecone(query, 3); // 5 → 3
```

---

## 🎯 추천 실행 계획

### 단기 (지금 ~ 2월 24일)
1. ✅ **GCP Blaze 플랜 활성화** (결제 카드 등록)
2. ✅ **CORS 수정 배포** (이미 수정 완료)
3. ✅ **서비스 복구 확인**
4. 📊 **1주일 비용 모니터링**

### 중기 (2월 말 ~ 3월)
- 비용이 $20/월 이하면 → GCP 유지
- 비용이 $20/월 초과면 → Vercel + Supabase 마이그레이션 고려

### 장기 (학기 종료 후)
- 교수님 발표 완료 후 서비스 중단 또는
- 무료 티어로 완전 전환 (Vercel + Supabase + Groq)

---

## 🚀 지금 바로 해야 할 일

```bash
# Step 1: GCP Blaze 플랜 활성화
# https://console.cloud.google.com/billing/linkedaccount?project=hi-project-flutter-chatbot

# Step 2: Cloud Functions 배포
cd /Users/kim/Documents/GitHub/Flutter_Chatbot/functions
npm run deploy

# Step 3: 서비스 테스트
# https://flutter-chatbot.vercel.app에서 챗봇 동작 확인

# Step 4: 비용 알림 설정
# https://console.cloud.google.com/billing/budgets
# - 예산: $20/월
# - 알림: 50%, 90%, 100%
```

---

## ⚠️ 중요 노트

1. **GCP 무료 체험 만료는 2월 24일까지** - 그 전에 결정 필요
2. **CORS 수정은 배포해야 적용됨** - Blaze 플랜 필요
3. **현재 사용자가 접속 불가 상태** - 빠른 결정 필요
4. **비용 모니터링 필수** - 예상치 못한 과금 방지

---

## 📞 다음 단계

어떤 옵션을 선택하시겠습니까?

1. **옵션 1** - GCP Blaze 플랜 활성화 (지금 바로 배포)
2. **옵션 2** - 새 GCP 계정으로 마이그레이션
3. **옵션 3** - Vercel + Supabase 무료 전환

선택하시면 상세 가이드를 제공하겠습니다.
