# 🚀 Vercel 배포 가이드

## 1. Vercel 계정 생성
1. https://vercel.com 접속
2. GitHub 계정으로 로그인
3. 무료 Hobby 플랜 선택

## 2. 프로젝트 배포

### 방법 A: CLI로 배포 (추천)
```bash
cd apps/admin
vercel
```

첫 배포 시 질문에 답변:
- Set up and deploy? **Y**
- Which scope? **선택**
- Link to existing project? **N**
- Project name? **modu-repair-admin** (또는 원하는 이름)
- Directory? **./apps/admin**
- Override settings? **N**

### 방법 B: GitHub 연동 (자동 배포)
1. Vercel 대시보드에서 "New Project" 클릭
2. GitHub 저장소 연결
3. Root Directory: `apps/admin` 설정
4. Framework Preset: Next.js 자동 감지
5. Deploy 클릭

## 3. 환경 변수 설정

Vercel 대시보드 → Settings → Environment Variables에서 추가:

### Required Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_STREAM_API_TOKEN=your_stream_token
EPOST_API_KEY=your_epost_key
```

### Optional Variables
```
NEXT_PUBLIC_TOSS_CLIENT_KEY=your_toss_client_key
TOSS_SECRET_KEY=your_toss_secret_key
```

**중요:** 각 변수를 Production, Preview, Development 환경 모두에 추가하세요.

## 4. 도메인 연결

### 커스텀 도메인 추가
1. Vercel 대시보드 → Settings → Domains
2. 도메인 입력 (예: admin.modusrepair.com)
3. DNS 설정 안내에 따라 도메인 제공업체에서 설정:

#### A 레코드 방식
```
Type: A
Name: admin (또는 @)
Value: 76.76.21.21
```

#### CNAME 방식 (추천)
```
Type: CNAME
Name: admin
Value: cname.vercel-dns.com
```

4. SSL 인증서 자동 발급 (무료)

## 5. 배포 확인

### 체크리스트
- [ ] 사이트 접속 확인
- [ ] 로그인 기능 테스트
- [ ] API 연동 확인
- [ ] 송장 출력 테스트
- [ ] 영상 업로드 테스트

### 문제 해결
- **빌드 실패**: Vercel 대시보드 → Deployments → Build Logs 확인
- **환경 변수 오류**: Settings → Environment Variables 재확인
- **API 오류**: Supabase 대시보드에서 CORS 설정 확인

## 6. 성능 최적화 (선택)

### Edge Config (무료)
```bash
vercel env pull
```

### Analytics 활성화
Vercel 대시보드 → Analytics → Enable

### 리전 설정
한국 사용자 최적화: `vercel.json`에서 `"regions": ["icn1"]` 설정됨

## 7. 모니터링

### Vercel Analytics
- 페이지 로드 시간
- Core Web Vitals
- 방문자 통계

### Logs
```bash
vercel logs
```

## 8. 업데이트 배포

### Git Push로 자동 배포
```bash
git add .
git commit -m "Update admin dashboard"
git push
```

### CLI로 수동 배포
```bash
cd apps/admin
vercel --prod
```

## 비용 예상

### Hobby 플랜 (무료)
- ✅ 100GB 대역폭/월
- ✅ 무제한 배포
- ✅ 자동 SSL
- ✅ 커스텀 도메인

### 초과 시
- 대역폭: $40/100GB
- 빌드 시간: 무제한 (무료)

### Pro 플랜 ($20/월)
- 1TB 대역폭
- 팀 협업
- 고급 분석

---

## 🆘 도움이 필요하면

- Vercel 문서: https://vercel.com/docs
- Supabase 문서: https://supabase.com/docs
- 이슈 발생 시: GitHub Issues

