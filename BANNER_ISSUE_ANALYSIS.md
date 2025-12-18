# 배너 표시 불일치 문제 분석 보고서

## 📊 문제 상황

| 구분 | 배너 관리 페이지 | Flutter 앱 |
|------|-----------------|-----------|
| 표시되는 배너 수 | 6개 (활성화) | 3개만 표시 |
| 동작 상태 | 정상 | 비정상 |

## 🔍 원인 분석

### 1. Flutter 앱 로그 분석

```
flutter: 배너 조회 실패: PostgrestException(
  message: permission denied for table users, 
  code: 42501, 
  details: Forbidden, 
  hint: null
)
```

### 2. 코드 분석

#### 문제가 있는 RLS 정책 (기존)
```sql
-- 파일: supabase/migrations/20251216222909_create_banners_table.sql

CREATE POLICY "Admins can view all banners"
  ON public.banners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users  -- ❌ 문제: 일반 사용자가 접근할 수 없는 테이블
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );
```

#### Flutter 앱의 배너 조회 코드
```dart
// 파일: apps/mobile/lib/services/banner_service.dart

Future<List<Map<String, dynamic>>> getActiveBanners() async {
  try {
    final response = await _supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', ascending: true);
    
    return (response as List<dynamic>)
        .map((e) => e as Map<String, dynamic>)
        .toList();
  } catch (e) {
    debugPrint('배너 조회 실패: $e');
    return [];  // ❌ 오류 시 빈 리스트 반환
  }
}
```

#### Flutter 앱의 폴백 로직
```dart
// 파일: apps/mobile/lib/features/home/presentation/pages/home_page.dart (라인 438-459)

// 배너 데이터가 없거나 오류 발생 시 기본 배너 사용
List<Map<String, dynamic>> banners = [];
if (bannerSnapshot.hasData && bannerSnapshot.data!.isNotEmpty) {
  banners = bannerSnapshot.data!;
} else {
  // 기본 배너 (데이터베이스에 배너가 없을 때)
  banners = [
    {
      'title': '멀리 갈 필요 없이\n문앞에 두고',
      'button_text': hasOrders ? '수거신청 하기' : '첫 수거신청 하기',
      'background_color': '#2D3E50',
      'background_image_url': null,
    },
    // ... 총 3개의 하드코딩된 배너
  ];
}
```

### 3. 관리자 페이지는 왜 정상 작동하는가?

#### 관리자 페이지 API
```typescript
// 파일: apps/admin/app/api/admin/banners/route.ts

export async function GET(req: NextRequest) {
  // ✅ supabaseAdmin (service role key) 사용
  let query = supabaseAdmin
    .from("banners")
    .select("*")
    .order("display_order", { ascending: true });
    
  const { data, error } = await query;
  // ...
}
```

**핵심 차이점:**
- **관리자 페이지**: 서버 사이드에서 `supabaseAdmin` (service role key) 사용 → RLS 우회
- **Flutter 앱**: 클라이언트 사이드에서 일반 사용자 권한으로 접근 → RLS 정책 적용

## 🎯 문제의 핵심

### RLS 정책 평가 과정

1. Flutter 앱이 배너 조회 요청
2. Supabase가 RLS 정책 평가 시작
3. "Anyone can view active banners" 정책 평가 → 통과
4. "Admins can view all banners" 정책 평가 시작
5. `auth.users` 테이블 접근 시도
6. **권한 오류 발생** (일반 사용자는 `auth.users` 접근 불가)
7. 전체 쿼리 실패
8. Flutter 앱이 빈 리스트 받음
9. 폴백 로직으로 하드코딩된 3개 배너 표시

### PostgreSQL RLS 동작 방식

- **SELECT 정책이 여러 개일 때**: OR 조건으로 평가
- **정책 평가 중 오류 발생**: 전체 쿼리 실패
- **auth.users 테이블**: Supabase Auth 내부 테이블로, 일반 사용자 접근 불가

## ✅ 해결 방법

### 수정된 RLS 정책

```sql
CREATE POLICY "Admins can view all banners"
  ON public.banners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users  -- ✅ 수정: public.users 사용
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );
```

### 변경 사항
- `auth.users` → `public.users`
- `id` → `auth_id`

### 적용 방법
1. Supabase Dashboard → SQL Editor
2. `supabase/migrations/fix_banner_rls_policies.sql` 실행
3. Flutter 앱 Hot Restart (`R` 키)

## 📈 예상 결과

### 수정 전
```
Flutter 앱 → Supabase 배너 조회 → RLS 정책 오류 → 빈 리스트 → 3개 기본 배너 표시
```

### 수정 후
```
Flutter 앱 → Supabase 배너 조회 → RLS 정책 통과 → 6개 배너 데이터 → 6개 배너 표시
```

## 🔧 추가 개선 사항

### 1. 에러 로깅 개선
```dart
// banner_service.dart
Future<List<Map<String, dynamic>>> getActiveBanners() async {
  try {
    final response = await _supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', ascending: true);
    
    debugPrint('✅ 배너 조회 성공: ${response.length}개');
    return (response as List<dynamic>)
        .map((e) => e as Map<String, dynamic>)
        .toList();
  } catch (e) {
    debugPrint('❌ 배너 조회 실패: $e');
    debugPrint('스택 트레이스: ${StackTrace.current}');
    return [];
  }
}
```

### 2. 관리자 페이지에 경고 표시
```typescript
// apps/admin/app/dashboard/banners/page.tsx
// 활성화된 배너가 3개 미만일 때 경고 표시
{sortedBanners.filter(b => b.is_active).length < 3 && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
    <p className="text-yellow-800">
      ⚠️ 활성화된 배너가 {sortedBanners.filter(b => b.is_active).length}개입니다. 
      최소 3개 이상 권장합니다.
    </p>
  </div>
)}
```

## 📚 학습 포인트

### 1. RLS 정책 설계 시 주의사항
- 클라이언트 사이드에서 접근할 수 없는 테이블 참조 금지
- `auth.users` 대신 `public.users` 사용
- 정책 평가 중 오류가 전체 쿼리를 실패시킬 수 있음

### 2. 서버 vs 클라이언트 권한 차이
- 서버 사이드 (service role key): RLS 우회
- 클라이언트 사이드 (anon key): RLS 정책 적용

### 3. 디버깅 방법
- Flutter 앱 로그 확인
- Supabase Dashboard에서 직접 쿼리 테스트
- RLS 정책을 일시적으로 비활성화하여 문제 격리

## 🎯 결론

**문제**: RLS 정책이 `auth.users` 테이블을 참조하여 일반 사용자의 배너 조회 실패

**해결**: `public.users` 테이블을 참조하도록 RLS 정책 수정

**영향**: Flutter 앱에서 데이터베이스의 모든 활성화된 배너(6개)를 정상적으로 표시

**교훈**: 클라이언트 사이드에서 사용하는 RLS 정책은 일반 사용자가 접근 가능한 테이블만 참조해야 함

