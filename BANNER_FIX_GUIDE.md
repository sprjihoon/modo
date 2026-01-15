# 배너 표시 문제 해결 가이드

## 🔍 문제 진단 결과

### 증상
- **배너 관리 페이지**: 6개 배너가 활성화되어 있다고 표시
- **Flutter 앱**: 3개 배너만 표시됨

### 근본 원인
Flutter 앱의 터미널 로그에서 발견된 오류:
```
flutter: 배너 조회 실패: PostgrestException(message: permission denied for table users, code: 42501, details: Forbidden, hint: null)
```

**문제점:**
1. 배너 테이블의 RLS(Row Level Security) 정책이 `auth.users` 테이블을 참조
2. 일반 사용자는 `auth.users` 테이블에 접근 권한이 없음
3. RLS 정책 평가 중 권한 오류 발생
4. 배너 조회 실패 → Flutter 앱이 하드코딩된 기본 3개 배너만 표시

### 왜 관리자 페이지는 정상 작동하는가?
- 관리자 페이지는 **서버 사이드 API**를 통해 `supabaseAdmin` (service role key) 사용
- Service role key는 RLS를 우회하므로 권한 오류가 발생하지 않음
- Flutter 앱은 **클라이언트 사이드**에서 직접 Supabase에 접근하므로 RLS 정책의 영향을 받음

## 🔧 해결 방법

### 1단계: Supabase Dashboard에서 SQL 실행

1. Supabase Dashboard 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. 아래 SQL을 복사하여 실행:

```sql
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can view active banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can view all banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can insert banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can update banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can delete banners" ON public.banners;

-- 정책: 모든 사용자는 활성화된 배너만 조회 가능
CREATE POLICY "Anyone can view active banners"
  ON public.banners
  FOR SELECT
  USING (is_active = true);

-- 정책: 관리자는 모든 배너 조회 가능 (public.users 테이블 사용)
CREATE POLICY "Admins can view all banners"
  ON public.banners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );

CREATE POLICY "Admins can insert banners"
  ON public.banners
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );

CREATE POLICY "Admins can update banners"
  ON public.banners
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );

CREATE POLICY "Admins can delete banners"
  ON public.banners
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );
```

### 2단계: Flutter 앱 재시작

터미널에서 Flutter 앱을 Hot Restart:
```bash
# Flutter 앱이 실행 중인 터미널에서 'R' 키 입력
R
```

### 3단계: 확인

1. Flutter 앱에서 홈 화면 확인
2. 배너가 6개 모두 표시되는지 확인
3. 배너 슬라이드가 정상 작동하는지 확인

## 📝 변경 사항 요약

### 변경 전 (문제 있는 코드)
```sql
CREATE POLICY "Admins can view all banners"
  ON public.banners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users  -- ❌ 일반 사용자 접근 불가
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );
```

### 변경 후 (수정된 코드)
```sql
CREATE POLICY "Admins can view all banners"
  ON public.banners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users  -- ✅ 공개 테이블 사용
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );
```

## 🎯 핵심 포인트

1. **RLS 정책은 클라이언트 사이드 접근에 영향을 줌**
   - Flutter 앱 같은 클라이언트는 RLS 정책을 따름
   - 관리자 페이지(서버 사이드)는 service role key로 RLS 우회

2. **auth.users vs public.users**
   - `auth.users`: Supabase Auth 내부 테이블, 일반 사용자 접근 불가
   - `public.users`: 애플리케이션 사용자 테이블, RLS 정책으로 접근 제어 가능

3. **OR 조건으로 작동하는 SELECT 정책**
   - 여러 SELECT 정책이 있으면 OR 조건으로 평가됨
   - 하나의 정책이라도 실패하면 전체 쿼리가 실패할 수 있음

## 🔍 추가 디버깅

만약 문제가 계속되면:

1. **배너 데이터 확인**
```sql
SELECT id, title, is_active, display_order 
FROM public.banners 
ORDER BY display_order;
```

2. **RLS 정책 확인**
```sql
SELECT * FROM pg_policies WHERE tablename = 'banners';
```

3. **Flutter 앱 로그 확인**
```bash
# Flutter 터미널에서 배너 조회 관련 로그 확인
# "배너 조회 실패" 또는 "배너 조회 성공" 메시지 확인
```

## 📚 참고 자료

- [Supabase RLS 문서](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

