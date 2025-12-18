# ⚡ 빠른 배포 가이드

> **목표:** 최소한의 단계로 프로덕션에 배포하기

---

## 🎯 Option 1: 즉시 배포 (5분)

### Step 1: Git Commit

```bash
cd /Users/jangjihoon/modo

git add .
git commit -m "feat: Video processing improvements with TUS Protocol and HLS player"
git push origin main
```

### Step 2: Vercel 환경 변수 설정

**Vercel Dashboard → Settings → Environment Variables**

추가할 변수:
```
NEXT_PUBLIC_USE_TUS_UPLOAD = true (Production)
NEXT_PUBLIC_USE_DIRECT_FILE_UPLOAD = true (Production)
```

### Step 3: 재배포

Vercel이 자동으로 배포하거나:
```bash
vercel --prod
```

**완료!** 🎉

---

## 🎯 Option 2: 안전한 배포 (1시간)

### Step 1: Preview 먼저 테스트

```bash
git push origin feature/video-improvements
```

Preview URL에서 테스트 후 main에 merge

### Step 2: Production 환경 변수 (비활성화)

```
NEXT_PUBLIC_USE_TUS_UPLOAD = false (처음에는)
```

### Step 3: 수동으로 활성화

필요할 때 환경 변수를 `true`로 변경

---

## 🎯 Option 3: 점진적 배포 (1-2주)

**DEPLOYMENT_CHECKLIST.md** 참고

---

## 💡 권장 사항

### 현재 상황에서는:

**즉시 배포하기보다는:**

1. **일단 Preview 배포**
   ```bash
   git push origin main
   ```
   
2. **Preview URL에서 테스트**
   - 다른 팀원들과 함께 테스트
   - 실제 데이터로 테스트
   
3. **문제 없으면 Production 활성화**
   ```
   NEXT_PUBLIC_USE_TUS_UPLOAD = true
   ```

---

## 🚨 롤백 방법

### 1분 안에 롤백:

**Vercel Dashboard:**
```
NEXT_PUBLIC_USE_TUS_UPLOAD = false
```

또는:

```bash
vercel rollback [deployment-url]
```

---

**버전:** 1.0  
**작성일:** 2025-12-18

