# Vercel 배포 반영 안됨 문제 해결 가이드

## 🔍 확인 사항

### 1. Vercel 프로젝트 설정 확인
Vercel 대시보드에서 다음 설정을 확인하세요:

**Settings → General → Root Directory**
- ✅ `apps/admin`으로 설정되어 있어야 함
- ❌ 루트 디렉토리(`/`)로 설정되어 있으면 변경 필요

### 2. 최신 커밋 확인
현재 최신 커밋: `c6dbd98` (관리자/센터 콘솔 네비게이션 개선)

Vercel 대시보드에서:
- Deployments 탭에서 최신 배포가 이 커밋을 사용하는지 확인
- 배포 상태가 "Ready"인지 확인

### 3. 빌드 로그 확인
Vercel 대시보드 → Deployments → 최신 배포 → Build Logs

확인할 내용:
- 빌드가 성공했는지
- 에러 메시지가 있는지
- 환경 변수가 제대로 로드되었는지

## 🛠️ 해결 방법

### 방법 1: Vercel 대시보드에서 재배포
1. Vercel 대시보드 접속
2. 프로젝트 선택
3. Deployments 탭
4. 최신 배포의 "..." 메뉴 클릭
5. "Redeploy" 선택
6. "Use existing Build Cache" 체크 해제 (캐시 무시)
7. 재배포 실행

### 방법 2: Root Directory 재설정
1. Vercel 대시보드 → Settings → General
2. Root Directory 확인/변경
3. `apps/admin`으로 설정
4. 저장 후 재배포

### 방법 3: Vercel CLI로 강제 재배포
```bash
cd apps/admin
vercel --prod --force
```

### 방법 4: 빌드 캐시 클리어
Vercel 대시보드에서:
1. Settings → General
2. "Clear Build Cache" 클릭
3. 재배포

### 방법 5: 환경 변수 확인
Vercel 대시보드 → Settings → Environment Variables

필수 환경 변수 확인:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

모든 환경 변수가 Production, Preview, Development에 설정되어 있는지 확인

## 🔄 자동 배포 설정 확인

### GitHub 연동 확인
1. Vercel 대시보드 → Settings → Git
2. GitHub 저장소가 연결되어 있는지 확인
3. 브랜치가 `main`으로 설정되어 있는지 확인

### Webhook 확인
1. GitHub 저장소 → Settings → Webhooks
2. Vercel webhook이 활성화되어 있는지 확인

## 📝 vercel.json 개선

현재 `apps/admin/vercel.json`에 Root Directory가 명시되어 있지 않습니다.
Vercel 대시보드에서 수동으로 설정해야 합니다.

## ⚡ 빠른 해결 (권장)

1. **Vercel 대시보드 접속**
2. **프로젝트 선택**
3. **Deployments 탭 → 최신 배포 → Redeploy**
4. **"Use existing Build Cache" 체크 해제**
5. **재배포 실행**

이렇게 하면 대부분의 경우 해결됩니다.

## 🐛 여전히 안되면

1. Vercel 대시보드 → Deployments → Build Logs 확인
2. 에러 메시지 복사
3. 터미널에서 로컬 빌드 테스트:
   ```bash
   cd apps/admin
   npm run build
   ```
4. 로컬 빌드가 성공하면 Vercel 설정 문제일 가능성 높음

