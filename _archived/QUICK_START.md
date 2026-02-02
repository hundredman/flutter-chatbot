# 🚀 빠른 시작 가이드 (100% 무료)

## 1단계: 무료 API 키 발급 (15분)

### 1️⃣ Groq API (무료 LLM)
```bash
1. https://console.groq.com/ 접속
2. 이메일 가입 (Gmail 사용 가능)
3. API Keys → Create API Key
4. 키 복사 (gsk_로 시작)
```

**제한**:
- 초당 30 requests
- 일일 14,400 requests
- **충분함** ✅

---

### 2️⃣ Hugging Face (무료 임베딩)
```bash
1. https://huggingface.co/join 접속
2. 가입 (무료)
3. Settings → Access Tokens → New Token
4. Role: Read 선택
5. 토큰 복사 (hf_로 시작)
```

**제한**:
- 초당 1 request
- **충분함** ✅ (검색 시에만 사용)

---

### 3️⃣ Pinecone (무료 벡터 DB)
```bash
# 이미 계정이 있으므로 API 키만 확인
1. https://app.pinecone.io 로그인
2. API Keys 탭
3. 키 복사 (pcsk_로 시작)
```

**제한**:
- 1 index 무료
- 100,000 벡터
- **충분함** ✅

---

## 2단계: Vercel 환경 변수 설정 (5분)

```bash
# Vercel Dashboard 접속
https://vercel.com/[your-username]/flutter-chatbot

# Settings → Environment Variables
# 아래 3개 변수 추가:

PINECONE_API_KEY = pcsk_xxxxx
GROQ_API_KEY = gsk_xxxxx
HUGGINGFACE_API_KEY = hf_xxxxx
```

**중요**: Production, Preview, Development 모두 체크!

---

## 3단계: GitHub Secrets 설정 (5분)

```bash
# GitHub Repository 접속
https://github.com/HI-Group/Flutter_Chatbot

# Settings → Secrets and variables → Actions → New repository secret

# 아래 3개 시크릿 추가:
PINECONE_API_KEY = pcsk_xxxxx
HUGGINGFACE_API_KEY = hf_xxxxx
GITHUB_TOKEN = (자동 제공됨, 추가 불필요)
```

---

## 4단계: 배포 (5분)

### 옵션 A: Vercel CLI (권장)

```bash
# 프로젝트 디렉토리로 이동
cd /Users/kim/Documents/GitHub/Flutter_Chatbot

# Vercel 배포
vercel --prod

# 결과:
# ✅ Production: https://flutter-chatbot.vercel.app
```

### 옵션 B: GitHub Push (자동 배포)

```bash
git add .
git commit -m "feat: migrate to 100% free stack (Vercel + Groq + Pinecone)"
git push origin main

# Vercel이 자동으로 감지하고 배포
```

---

## 5단계: 첫 문서 동기화 (5분)

### GitHub Actions로 수동 실행

```bash
1. https://github.com/HI-Group/Flutter_Chatbot/actions
2. "Sync Flutter Docs to Pinecone" 워크플로우 선택
3. "Run workflow" → "Run workflow" 클릭
4. 대기 (약 30-60분 소요)
```

**또는 로컬에서 실행:**

```bash
cd /Users/kim/Documents/GitHub/Flutter_Chatbot

# 환경 변수 설정
export PINECONE_API_KEY="pcsk_xxxxx"
export HUGGINGFACE_API_KEY="hf_xxxxx"
export GITHUB_TOKEN="ghp_xxxxx"

# 동기화 실행
node scripts/sync-docs.js
```

---

## 6단계: 테스트 (2분)

### API 엔드포인트 테스트

```bash
# 챗봇 API 테스트
curl https://flutter-chatbot.vercel.app/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"What is Flutter?","language":"en"}'

# 예상 응답:
# {
#   "success": true,
#   "answer": "Flutter is Google's...",
#   "sources": [...]
# }
```

### 웹사이트 테스트

```bash
# 브라우저에서 접속
https://flutter-chatbot.vercel.app

# 테스트 질문:
# - "What is Flutter?"
# - "How to create a button in Flutter?"
# - "StatefulWidget vs StatelessWidget"
```

---

## 🎉 완료!

### ✅ 확인 사항

- [ ] 웹사이트 접속 가능
- [ ] 챗봇 질문 응답 정상
- [ ] 한글/영어 전환 작동
- [ ] 학습 진도 저장 (로컬 스토리지)
- [ ] GitHub Actions 정상 실행

### 📊 자동 업데이트

- **매주 월요일 정오 12시 (한국 시간)**
- Flutter 공식 문서 자동 동기화
- Pinecone 벡터 DB 업데이트

### 💰 비용

**총 비용: $0/월** 🎉

---

## 🔧 문제 해결

### 1. API 응답 오류

```bash
# 환경 변수 확인
# Vercel Dashboard → Settings → Environment Variables
# 3개 변수 모두 설정되었는지 확인

# 재배포
vercel --prod
```

### 2. GitHub Actions 실패

```bash
# Secrets 확인
# GitHub → Settings → Secrets
# PINECONE_API_KEY, HUGGINGFACE_API_KEY 확인

# 수동 재실행
# Actions → Sync Flutter Docs → Re-run jobs
```

### 3. Pinecone 검색 결과 없음

```bash
# 문서 동기화 실행
node scripts/sync-docs.js

# 또는 GitHub Actions에서 수동 실행
```

### 4. Groq API Rate Limit

```bash
# 에러: "Rate limit exceeded"
# 해결: 1분 대기 후 재시도
# Groq 무료 티어: 초당 30 requests
```

---

## 📚 추가 자료

- [Groq API 문서](https://console.groq.com/docs)
- [Hugging Face Inference API](https://huggingface.co/docs/api-inference)
- [Pinecone 가이드](https://docs.pinecone.io)
- [Vercel Functions](https://vercel.com/docs/functions)
- [GitHub Actions](https://docs.github.com/en/actions)

---

## 🎯 다음 단계

1. 교수님께 발표 준비
2. 비용 $0 강조
3. 자동 업데이트 시스템 시연
4. 기술 스택 설명 (Groq, Pinecone, Vercel)

**모든 것이 100% 무료로 작동합니다!** 🚀
