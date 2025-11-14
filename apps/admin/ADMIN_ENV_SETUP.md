# 관리자 페이지 환경 변수 설정 가이드

## 문제 해결: "고객이 없습니다" 오류

관리자 페이지에서 고객 정보를 조회하려면 **Service Role Key**가 필요합니다.

## 환경 변수 설정

`apps/admin/.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ⚠️ 중요: Service Role Key (서버 사이드에서만 사용)
# 이 키는 RLS를 우회하여 모든 데이터에 접근할 수 있습니다
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 앱 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Service Role Key 찾는 방법

1. Supabase Dashboard 접속
2. **Settings** → **API** 메뉴
3. **service_role** 키 복사 (⚠️ 절대 공개하지 마세요!)

## 확인 방법

환경 변수를 설정한 후:

1. 관리자 페이지 재시작
   ```bash
   cd apps/admin
   npm run dev
   ```

2. 브라우저에서 고객 관리 페이지 확인
   - `http://localhost:3000/dashboard/customers`

3. 브라우저 콘솔 확인
   - F12 → Console 탭
   - 에러 메시지 확인

## 문제가 계속되면

1. **환경 변수 확인**
   - `.env.local` 파일이 `apps/admin/` 디렉토리에 있는지 확인
   - 파일 이름이 정확한지 확인 (`.env.local`)

2. **Supabase 연결 확인**
   - Supabase Dashboard에서 프로젝트가 활성화되어 있는지 확인
   - API 키가 올바른지 확인

3. **RLS 정책 확인**
   - Supabase Dashboard → Authentication → Policies
   - `users` 테이블의 RLS 정책 확인

4. **데이터 확인**
   - Supabase Dashboard → Table Editor → `users` 테이블
   - 실제로 데이터가 있는지 확인

## 보안 주의사항

⚠️ **Service Role Key는 절대 클라이언트에 노출하면 안 됩니다!**
- `.env.local` 파일은 Git에 커밋하지 마세요
- `.gitignore`에 이미 포함되어 있습니다
- 프로덕션에서는 서버 사이드에서만 사용하세요

