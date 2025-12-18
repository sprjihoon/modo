# 🚨 배너 표시 문제 해결 - 빠른 가이드

## 문제 요약
- **증상**: 배너 관리에서 6개 활성화, 앱에서는 3개만 표시
- **원인**: RLS 정책이 `auth.users` 테이블 참조 → 권한 오류
- **해결**: RLS 정책을 `public.users` 테이블로 변경

## 🔧 즉시 해결 방법 (5분)

### 1단계: Supabase SQL 실행

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴 **SQL Editor** 클릭
4. 아래 SQL 복사 & 실행:

```sql
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can view active banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can view all banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can insert banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can update banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can delete banners" ON public.banners;

-- 새 정책 생성 (public.users 사용)
CREATE POLICY "Anyone can view active banners"
  ON public.banners FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all banners"
  ON public.banners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

CREATE POLICY "Admins can insert banners"
  ON public.banners FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

CREATE POLICY "Admins can update banners"
  ON public.banners FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

CREATE POLICY "Admins can delete banners"
  ON public.banners FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );
```

### 2단계: Flutter 앱 재시작

Flutter 실행 중인 터미널에서:
```
R  (대문자 R 입력 후 Enter)
```

### 3단계: 확인

✅ Flutter 앱 홈 화면에서 6개 배너가 모두 표시되는지 확인

## 📋 상세 분석

자세한 분석은 다음 문서 참조:
- [BANNER_ISSUE_ANALYSIS.md](./BANNER_ISSUE_ANALYSIS.md) - 전체 분석 보고서
- [BANNER_FIX_GUIDE.md](./BANNER_FIX_GUIDE.md) - 상세 해결 가이드

## ❓ 문제가 계속되면?

### 배너 데이터 확인
```sql
SELECT id, title, is_active, display_order 
FROM public.banners 
ORDER BY display_order;
```

### RLS 정책 확인
```sql
SELECT * FROM pg_policies WHERE tablename = 'banners';
```

### Flutter 로그 확인
- "배너 조회 성공" 메시지가 나타나야 함
- "배너 조회 실패" 메시지가 나타나면 여전히 문제 있음

## 🎯 핵심 포인트

| 항목 | 변경 전 (❌) | 변경 후 (✅) |
|------|------------|------------|
| 테이블 | `auth.users` | `public.users` |
| 컬럼 | `id` | `auth_id` |
| 접근 | 일반 사용자 불가 | 일반 사용자 가능 |
| 결과 | 권한 오류 | 정상 조회 |

---

**작성일**: 2025-12-18  
**작성자**: AI Assistant  
**문제 해결 시간**: 약 5분

