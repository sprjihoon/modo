# 프로모션 코드 기능 설정 가이드

프로모션 코드 기능을 사용하기 위한 데이터베이스 설정 및 사용 가이드입니다.

## 📋 목차

1. [데이터베이스 스키마 적용](#데이터베이스-스키마-적용)
2. [기능 소개](#기능-소개)
3. [관리자 페이지 사용법](#관리자-페이지-사용법)
4. [모바일 앱 사용법](#모바일-앱-사용법)
5. [API 사용법](#api-사용법)

## 🗄️ 데이터베이스 스키마 적용

### 1단계: Supabase 대시보드 접속

1. [Supabase 대시보드](https://app.supabase.com)에 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭

### 2단계: 스키마 실행

아래 SQL 파일들을 **순서대로** 실행하세요:

#### 1) 프로모션 코드 테이블 생성

```sql
-- apps/sql/schema/15_promotion_codes.sql 파일 내용을 복사하여 실행
```

**또는 SQL Editor에서 직접 실행:**

```sql
-- 할인 타입 ENUM
CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FIXED');

-- 프로모션 코드 테이블
CREATE TABLE IF NOT EXISTS public.promotion_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type discount_type NOT NULL DEFAULT 'PERCENTAGE',
  discount_value INTEGER NOT NULL,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  min_order_amount INTEGER DEFAULT 0,
  max_discount_amount INTEGER,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT promotion_codes_discount_value_check CHECK (discount_value > 0),
  CONSTRAINT promotion_codes_max_uses_check CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT promotion_codes_used_count_check CHECK (used_count >= 0),
  CONSTRAINT promotion_codes_percentage_check CHECK (
    discount_type != 'PERCENTAGE' OR (discount_value > 0 AND discount_value <= 100)
  )
);

-- 프로모션 코드 사용 이력 테이블
CREATE TABLE IF NOT EXISTS public.promotion_code_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_code_id UUID NOT NULL REFERENCES public.promotion_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  discount_amount INTEGER NOT NULL,
  original_amount INTEGER NOT NULL,
  final_amount INTEGER NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT promotion_code_usages_unique_order UNIQUE (order_id),
  CONSTRAINT promotion_code_usages_discount_check CHECK (discount_amount >= 0),
  CONSTRAINT promotion_code_usages_amounts_check CHECK (final_amount >= 0 AND final_amount <= original_amount)
);

-- 인덱스
CREATE INDEX idx_promotion_codes_code ON public.promotion_codes(code);
CREATE INDEX idx_promotion_codes_active ON public.promotion_codes(is_active);
CREATE INDEX idx_promotion_codes_valid_period ON public.promotion_codes(valid_from, valid_until);
CREATE INDEX idx_promotion_code_usages_user ON public.promotion_code_usages(user_id);
CREATE INDEX idx_promotion_code_usages_promo_code ON public.promotion_code_usages(promotion_code_id);

-- RLS 활성화
ALTER TABLE public.promotion_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_code_usages ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Anyone can view active promotion codes"
  ON public.promotion_codes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage promotion codes"
  ON public.promotion_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can view own promotion code usages"
  ON public.promotion_code_usages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can create promotion code usages"
  ON public.promotion_code_usages FOR INSERT
  WITH CHECK (true);
```

#### 2) 주문 테이블에 컬럼 추가

```sql
-- apps/sql/migrations/008_add_promotion_code_to_orders.sql 파일 내용을 실행

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS promotion_code_id UUID REFERENCES public.promotion_codes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS promotion_discount_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_total_price INTEGER;

UPDATE public.orders
SET original_total_price = total_price
WHERE original_total_price IS NULL;

ALTER TABLE public.orders
ADD CONSTRAINT orders_promotion_discount_check 
  CHECK (promotion_discount_amount >= 0 AND promotion_discount_amount <= COALESCE(original_total_price, total_price));

CREATE INDEX IF NOT EXISTS idx_orders_promotion_code ON public.orders(promotion_code_id);
```

#### 3) 함수 생성

```sql
-- apps/sql/schema/15_promotion_codes_functions.sql 파일 내용을 실행

CREATE OR REPLACE FUNCTION increment_promotion_code_usage(promo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.promotion_codes
  SET used_count = used_count + 1, updated_at = NOW()
  WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_promotion_code_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_promotion_code_usage(UUID) TO service_role;
```

#### 4) 샘플 데이터 추가 (선택사항)

```sql
INSERT INTO public.promotion_codes (code, discount_type, discount_value, max_uses, description, valid_until)
VALUES 
  ('WELCOME10', 'PERCENTAGE', 10, NULL, '신규 가입 고객 10% 할인', NOW() + INTERVAL '30 days'),
  ('SAVE5000', 'FIXED', 5000, 100, '5000원 즉시 할인', NOW() + INTERVAL '7 days'),
  ('HOLIDAY20', 'PERCENTAGE', 20, 50, '연말 특별 20% 할인', NOW() + INTERVAL '14 days'),
  ('FREESHIP', 'PERCENTAGE', 100, 20, '첫 주문 무료 이벤트', NOW() + INTERVAL '60 days');
```

## ✨ 기능 소개

### 주요 기능

1. **할인 타입**
   - 퍼센트 할인 (예: 10% 할인)
   - 고정 금액 할인 (예: 5,000원 할인)
   - 100% 할인으로 무료 사용 가능

2. **조건 설정**
   - 최소 주문 금액 설정
   - 최대 할인 금액 제한
   - 사용 횟수 제한 (전체 / 사용자별)
   - 유효기간 설정

3. **관리 기능**
   - 실시간 활성화/비활성화
   - 사용 현황 모니터링
   - 수정/삭제 기능

## 👨‍💼 관리자 페이지 사용법

관리(`/dashboard/promotions`)와 쿠폰 성적표(`/dashboard/analytics/marketing/actions` 쿠폰 탭)는 **같은 `promotion_codes` 목록**입니다.

- **한도:** 전체 선착순 횟수 + 사용자당 횟수. 둘 다 설정합니다.
- **사용 N건:** 결제된 주문에 코드가 붙은 횟수입니다. 한도를 줄여도 이미 결제된 건수는 그대로입니다.
- 생성·수정·삭제는 `/api/admin/promotions`(service role)를 탑니다.

### 프로모션 코드 생성

1. 관리자 대시보드 접속 (`admin.modo.mom/dashboard/promotions`)
2. 좌측 메뉴에서 **"프로모션 코드"** 클릭
3. **"프로모션 코드 생성"** 버튼 클릭
4. 다음 정보 입력:
   - **프로모션 코드**: 영문/숫자 조합 (예: WELCOME2024)
   - **할인 타입**: 퍼센트 또는 고정 금액 선택
   - **할인 값**: 할인율(%) 또는 할인 금액(원)
   - **최소 주문 금액**: 프로모션 사용 조건 (선택)
   - **최대 할인 금액**: 할인 한도 (선택)
   - **최대 사용 횟수**: 전체 사용 가능 횟수 (선택)
   - **사용자당 최대 사용 횟수**: 1인당 사용 제한
   - **유효기간**: 시작일 ~ 종료일
   - **설명**: 프로모션 설명

### 프로모션 코드 예시

#### 1) 신규 가입 10% 할인
- 코드: `WELCOME10`
- 할인 타입: 퍼센트 (10%)
- 사용자당 횟수: 1회
- 유효기간: 30일

#### 2) 5,000원 즉시 할인
- 코드: `SAVE5000`
- 할인 타입: 고정 금액 (5,000원)
- 최소 주문: 30,000원
- 최대 사용: 100회

#### 3) 첫 주문 무료 (100% 할인)
- 코드: `FREESHIP`
- 할인 타입: 퍼센트 (100%)
- 최대 할인: 50,000원
- 사용자당 횟수: 1회

## 📱 모바일 앱 사용법

### 프로모션 코드 적용 (고객용)

1. 수선 주문 진행 중 **수거신청 페이지**에서 프로모션 코드 입력란 찾기
2. 프로모션 코드 입력 (예: WELCOME10)
3. **"적용"** 버튼 클릭
4. 할인 금액 확인 후 주문 진행
5. 결제 페이지에서 최종 할인 적용 확인

### UI 위치

- **주문 생성 페이지** (`pickup_request_page.dart`)
  - 결제수단 섹션 아래
  - 고지사항 섹션 위
  - 프로모션 코드 입력 필드 + 적용 버튼

- **결제 페이지** (`payment_page.dart`)
  - 결제 금액 섹션에 할인 내역 표시
  - 원래 금액 취소선 + 할인 금액 + 최종 금액

## 🔌 API 사용법

### 프로모션 코드 검증

```dart
import 'package:your_app/services/promotion_service.dart';

final promotionService = PromotionService();

try {
  final result = await promotionService.validatePromotionCode(
    'WELCOME10',
    orderAmount: 50000,
  );
  
  print('할인 금액: ${result['discount_amount']}원');
  print('최종 금액: ${result['final_amount']}원');
} catch (e) {
  print('에러: $e');
}
```

### 프로모션 코드 사용 기록

```dart
await promotionService.recordPromotionCodeUsage(
  promotionCodeId: promoId,
  orderId: orderId,
  discountAmount: 5000,
  originalAmount: 50000,
  finalAmount: 45000,
);
```

## 📊 데이터베이스 구조

### promotion_codes 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 프로모션 코드 ID |
| code | TEXT | 프로모션 코드 |
| discount_type | ENUM | 할인 타입 (PERCENTAGE/FIXED) |
| discount_value | INTEGER | 할인 값 |
| max_uses | INTEGER | 최대 사용 횟수 |
| used_count | INTEGER | 현재 사용 횟수 |
| max_uses_per_user | INTEGER | 사용자당 최대 횟수 |
| min_order_amount | INTEGER | 최소 주문 금액 |
| max_discount_amount | INTEGER | 최대 할인 금액 |
| valid_from | TIMESTAMPTZ | 시작일 |
| valid_until | TIMESTAMPTZ | 종료일 |
| is_active | BOOLEAN | 활성 여부 |

### promotion_code_usages 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 사용 이력 ID |
| promotion_code_id | UUID | 프로모션 코드 ID |
| user_id | UUID | 사용자 ID |
| order_id | UUID | 주문 ID |
| discount_amount | INTEGER | 할인 금액 |
| original_amount | INTEGER | 원래 금액 |
| final_amount | INTEGER | 최종 금액 |
| used_at | TIMESTAMPTZ | 사용 시각 |

## 🔒 보안 및 주의사항

1. **RLS (Row Level Security) 적용됨**
   - 일반 사용자는 활성 프로모션 코드만 조회 가능
   - 관리자 쓰기는 `SUPER_ADMIN` / `ADMIN` / `MANAGER` (`users.auth_id = auth.uid()`)
   - 어드민 UI는 service role API를 쓰므로 브라우저 anon 세션과 무관하게 저장됨
   - 정책 SQL: `apps/sql/migrations/fix_promotion_codes_admin_rls.sql`

2. **중복 사용 방지**
   - 주문당 1개의 프로모션 코드만 적용 가능
   - 사용자별 최대 사용 횟수 제한

3. **유효성 검사**
   - 유효기간 자동 확인
   - 최대 사용 횟수 확인
   - 최소 주문 금액 확인
   - 할인율 범위 검증 (0% ~ 100%)

## 🚀 배포 체크리스트

- [ ] 데이터베이스 스키마 적용
- [ ] RLS 정책 확인
- [ ] 함수 권한 설정 확인
- [ ] 샘플 프로모션 코드 생성
- [ ] 관리자 페이지 접속 테스트
- [ ] 모바일 앱에서 프로모션 코드 적용 테스트
- [ ] 할인 금액 계산 정확성 확인

## 📝 문제 해결

### 프로모션 코드가 적용되지 않아요
1. 코드 철자 확인 (대소문자 구분 없음)
2. 유효기간 확인
3. 최소 주문 금액 확인
4. 사용 가능 횟수 확인
5. 프로모션 활성 상태 확인

### 관리자 페이지가 표시되지 않아요
1. 사용자 role이 `SUPER_ADMIN` / `ADMIN`인지 확인
2. 성적표에만 코드가 보이면 관리 API 배포 여부 확인 (`/api/admin/promotions`)
3. Supabase 연결 상태 확인

### 관리와 성적표 숫자가 달라요
1. 둘 다 결제된 주문을 봅니다. 이력(`promotion_code_usages`)만 비어 있어도 주문이 있으면 집계됩니다
2. 아직 결제에 한 번도 안 쓰인 코드는 0이 정상입니다

### 할인 금액이 이상해요
1. 할인 타입 확인 (퍼센트 vs 고정 금액)
2. 최대 할인 금액 설정 확인
3. 주문 금액 계산 로직 확인

## 🎉 완료!

프로모션 코드 기능이 정상적으로 설정되었습니다. 
이제 다양한 이벤트와 할인 쿠폰을 통해 고객 만족도를 높이세요!

