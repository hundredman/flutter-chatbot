# ✅ 실행 체크리스트

## 🔥 즉시 해야 할 일 (지금!)

### 1. Groq API 키 발급 (5분)
- [ ] https://console.groq.com/ 접속
- [ ] 이메일로 가입
- [ ] API Keys → Create API Key
- [ ] 키 복사 (gsk_로 시작)

### 2. Hugging Face 토큰 발급 (5분)
- [ ] https://huggingface.co/join 접속
- [ ] 가입
- [ ] Settings → Access Tokens → New Token
- [ ] Role: Read 선택
- [ ] 토큰 복사 (hf_로 시작)

### 3. Vercel 환경 변수 설정 (5분)
- [ ] https://vercel.com 로그인
- [ ] flutter-chatbot 프로젝트 선택
- [ ] Settings → Environment Variables
- [ ] `PINECONE_API_KEY` 추가 (기존 키 사용)
- [ ] `GROQ_API_KEY` 추가 (1번에서 발급한 키)
- [ ] `HUGGINGFACE_API_KEY` 추가 (2번에서 발급한 키)
- [ ] Production, Preview, Development 모두 체크!

### 4. GitHub Secrets 설정 (3분)
- [ ] https://github.com/HI-Group/Flutter_Chatbot 접속
- [ ] Settings → Secrets and variables → Actions
- [ ] New repository secret
- [ ] `PINECONE_API_KEY` 추가
- [ ] `HUGGINGFACE_API_KEY` 추가

### 5. Vercel 배포 (5분)

**옵션 A: 자동 배포 (권장)**
```bash
# 이미 push했으므로 Vercel이 자동으로 배포 중
# Vercel Dashboard에서 배포 상태 확인
# https://vercel.com/dashboard
```

**옵션 B: 수동 배포**
```bash
cd /Users/kim/Documents/GitHub/Flutter_Chatbot
vercel --prod
```

- [ ] 배포 완료 확인
- [ ] 배포 URL 확인: https://flutter-chatbot.vercel.app

### 6. 웹사이트 테스트 (2분)
- [ ] https://flutter-chatbot.vercel.app 접속
- [ ] 질문 입력: "What is Flutter?"
- [ ] 답변 확인 (Groq API 사용)
- [ ] 한글/영어 전환 테스트

### 7. GitHub Actions 첫 동기화 (수동 실행)
- [ ] https://github.com/HI-Group/Flutter_Chatbot/actions 접속
- [ ] "Sync Flutter Docs to Pinecone" 워크플로우 선택
- [ ] Run workflow → Run workflow 클릭
- [ ] 완료 대기 (30-60분)

---

## 📊 확인 사항

### API 키 체크
```bash
# Vercel에서 확인해야 할 환경 변수:
PINECONE_API_KEY = pcsk_xxxxx
GROQ_API_KEY = gsk_xxxxx
HUGGINGFACE_API_KEY = hf_xxxxx
```

### GitHub Secrets 체크
```bash
# GitHub에서 확인해야 할 시크릿:
PINECONE_API_KEY = (설정됨)
HUGGINGFACE_API_KEY = (설정됨)
GITHUB_TOKEN = (자동 제공)
```

---

## 🚨 문제 해결

### 문제 1: "Missing environment variable"
```bash
# Vercel 환경 변수 재확인
# 모든 변수가 Production, Preview, Development에 체크되어 있는지 확인
# Redeploy 필요
```

### 문제 2: "CORS error"
```bash
# api/chat.js에서 CORS 헤더가 제대로 설정되어 있는지 확인
# Vercel 재배포: vercel --prod
```

### 문제 3: GitHub Actions 실패
```bash
# GitHub Secrets 확인
# PINECONE_API_KEY, HUGGINGFACE_API_KEY 설정 확인
# 워크플로우 재실행
```

---

## 💡 다음 단계

### 단기 (오늘)
- [ ] 모든 API 키 발급 완료
- [ ] 배포 완료 및 테스트
- [ ] 첫 문서 동기화 완료

### 중기 (이번 주)
- [ ] 교수님께 시연 준비
- [ ] README 업데이트 (비용 $0 강조)
- [ ] 기술 스택 문서 정리

### 장기 (학기 말)
- [ ] 서비스 지속 가능성 확인
- [ ] 사용 통계 모니터링
- [ ] 필요시 무료 티어 확인

---

## 📞 지원

### 무료 서비스 한도
- Groq: 14,400 requests/일 (충분)
- Hugging Face: 무제한 (Rate limit: 1 req/s)
- Pinecone: 100,000 벡터 (충분)
- Vercel: 100시간 실행/월 (충분)
- GitHub Actions: 2,000분/월 Public (충분)

### 도움말
- Groq 문서: https://console.groq.com/docs
- Hugging Face API: https://huggingface.co/docs/api-inference
- Vercel 문서: https://vercel.com/docs

---

## 🎯 성공 기준

- [ ] ✅ 웹사이트 정상 접속
- [ ] ✅ 챗봇 질문 응답 작동
- [ ] ✅ 비용 $0/월
- [ ] ✅ 자동 업데이트 (매주 월요일)
- [ ] ✅ GCP 결제 중단

**모든 것이 무료로 작동합니다!** 🎉
