# Vercel 설정 가이드

## 🔧 Root Directory 설정 필요

Vercel Dashboard에서 Root Directory를 설정해야 합니다.

### 단계:

1. **Vercel Dashboard 접속**
   ```
   https://vercel.com/dashboard
   ```

2. **프로젝트 선택**
   ```
   flutter-chatbot 프로젝트 클릭
   ```

3. **Settings로 이동**
   ```
   Settings 탭 클릭
   ```

4. **General 섹션에서 Root Directory 설정**
   ```
   Root Directory: frontend
   ```
   - "Edit" 버튼 클릭
   - "frontend" 입력
   - "Save" 클릭

5. **Redeploy**
   ```
   Deployments 탭 → 최신 배포 → "Redeploy" 버튼
   ```

---

## ✅ 완료 후

frontend 디렉토리가 루트로 인식되어 정상적으로 빌드됩니다.

**빌드 명령어** (자동 감지):
- Install: `npm install`
- Build: `npm run build`
- Output: `build/`

---

## 🔗 Cloudflare Worker 연결

배포 완료 후:

1. Cloudflare Worker 배포 (아직 안 했다면)
   ```bash
   cd cloudflare-worker
   wrangler deploy
   ```

2. Vercel 환경 변수 설정
   ```
   Settings → Environment Variables

   REACT_APP_CLOUDFLARE_WORKER_URL =
   https://flutter-chatbot-worker.YOUR_SUBDOMAIN.workers.dev
   ```

3. 재배포
   ```
   Deployments → Redeploy
   ```

---

## 📝 참고

`vercel.json`은 이제 SPA 라우팅만 담당합니다:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

모든 빌드 설정은 Vercel Dashboard에서 자동으로 감지됩니다.
