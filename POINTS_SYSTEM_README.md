# 포인트 관리 시스템 구현

포인트 관리 시스템이 성공적으로 구현되었습니다. 이 문서는 구현된 기능과 사용 방법을 설명합니다.

## 📋 구현된 기능

### 1. 데이터베이스 스키마
- **포인트 거래 내역 테이블** (`point_transactions`)
  - 포인트 적립, 사용, 관리자 지급/차감, 만료 내역 관리
  - 주문 연결 및 관리자 추적
  
- **포인트 설정 테이블** (`point_settings`)
  - 기간별 적립률 설정
  - 우선순위 및 기본 설정 관리
  - 활성화/비활성화 기능

- **사용자 테이블 확장** (`users`)
  - `point_balance`: 현재 포인트 잔액
  - `total_earned_points`: 총 적립 포인트
  - `total_used_points`: 총 사용 포인트

### 2. 자동 포인트 적립
- 주문 상태가 `DELIVERED`(배송 완료)로 변경되면 자동으로 포인트 적립
- 현재 활성화된 포인트 설정의 적립률 자동 적용
- 적립된 포인트는 1년 후 만료

### 3. 관리자 기능

#### 고객 상세 페이지 (`/dashboard/customers/[id]`)
- **포인트 정보 표시**
  - 현재 포인트 잔액
  - 총 적립 포인트
  - 총 사용 포인트

- **포인트 지급/차감 기능**
  - 포인트 지급 (ADMIN_ADD)
  - 포인트 차감 (ADMIN_SUB)
  - 사유 입력 필수
  - 잔액 부족 시 차감 불가

#### 포인트 관리 페이지 (`/dashboard/points`)
- **포인트 설정** 탭 (`?tab=settings`)
  - 회원가입 적립 금액·활성
  - 친구 초대 적립(초대자/피초대자)
  - 주문 완료 적립률(기간·우선순위)
- **포인트 내역** 탭
  - 적립·사용·만료 거래 내역
- 예전 `/dashboard/settings/points`는 설정 탭으로 리다이렉트

- **현재 적용 중인 설정 표시**
  - 실시간으로 현재 적용 중인 적립률 확인

### 4. API 엔드포인트

#### 포인트 지급/차감
- `POST /api/customers/[id]/points` - 포인트 지급/차감
- `GET /api/customers/[id]/points` - 포인트 거래 내역 조회

#### 포인트 설정 관리
- `GET /api/points/settings` - 포인트 설정 목록 조회
- `POST /api/points/settings` - 포인트 설정 생성
- `PATCH /api/points/settings/[id]` - 포인트 설정 수정
- `DELETE /api/points/settings/[id]` - 포인트 설정 삭제

## 🚀 설치 및 실행 방법

### 1. 데이터베이스 스키마 적용

```bash
# Supabase CLI를 사용하는 경우
supabase migration new add_points_system
# 그리고 apps/sql/schema/16_points.sql 내용을 복사

# 또는 Supabase 대시보드에서 직접 실행
# 1. Supabase 대시보드 접속
# 2. SQL Editor로 이동
# 3. apps/sql/schema/16_points.sql 파일의 내용을 복사하여 실행
```

### 2. 환경 변수 확인

`.env.local` 파일에 다음 환경 변수가 설정되어 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. 앱 실행

```bash
cd apps/admin
npm install
npm run dev
```

## 📖 사용 방법

### 포인트 적립률 설정

1. 관리자 페이지 접속: `/dashboard/points`
2. 「포인트 설정」 탭에서 가입·초대 적립과 주문 적립률을 함께 관리
3. 주문 적립률은 "새 설정 추가" 버튼 클릭
4. 설정 정보 입력:
   - **설정명**: 예) "기본 적립률", "겨울 시즌 특별 적립"
   - **설명**: 설정에 대한 설명
   - **적립률**: 0 ~ 100% (예: 5% = 10,000원 결제 시 500P 적립)
   - **시작일**: 적립률 적용 시작일
   - **종료일**: 적립률 적용 종료일 (비워두면 무기한)
   - **우선순위**: 같은 날짜에 여러 설정이 있을 때 높은 숫자가 우선
   - **활성화**: 체크하면 즉시 적용
   - **기본 설정**: 체크하면 기본 적립률로 설정

### 고객에게 포인트 지급/차감

1. 고객 목록 페이지 접속: `/dashboard/customers`
2. 고객 선택하여 상세 페이지 이동
3. "포인트 관리" 카드에서 "포인트 지급/차감" 버튼 클릭
4. 다이얼로그에서:
   - **유형 선택**: 포인트 지급 또는 차감
   - **금액 입력**: 지급/차감할 포인트 금액
   - **사유 입력**: 포인트 지급/차감 사유 (필수)
5. 확인 버튼 클릭

### 자동 포인트 적립 확인

1. 주문이 배송 완료(`DELIVERED`) 상태로 변경되면 자동 적립
2. 적립률은 현재 활성화된 포인트 설정 기준
3. 고객 상세 페이지에서 포인트 잔액 및 내역 확인 가능

## 🎯 주요 특징

### 1. 기간별 적립률 관리
- 특정 기간 동안 다른 적립률 적용 가능
- 예: 연말 시즌에는 10%, 평소에는 5%
- 우선순위 시스템으로 여러 설정 충돌 방지

### 2. 자동 적립
- 주문 완료 시 자동으로 포인트 적립
- 데이터베이스 트리거로 구현되어 안정적
- 적립 포인트는 결제 금액의 x% (소수점 이하 버림)

### 3. 관리자 통제
- 고객별 포인트 직접 지급/차감 가능
- 모든 거래는 사유와 함께 기록
- 잔액 부족 시 차감 불가로 안전성 보장

### 4. 포인트 만료
- 적립된 포인트는 1년 후 자동 만료
- 만료 시스템은 데이터베이스 레벨에서 관리

## 📊 데이터베이스 함수

### `manage_user_points()`
포인트 지급/차감을 처리하는 메인 함수

```sql
SELECT manage_user_points(
  p_user_id := 'user-uuid',
  p_amount := 1000,
  p_type := 'EARNED'::point_transaction_type,
  p_description := '주문 완료 적립',
  p_order_id := 'order-uuid',
  p_admin_user_id := NULL,
  p_expires_at := NOW() + INTERVAL '1 year'
);
```

### `get_current_point_setting()`
현재 적용 가능한 포인트 설정 조회

```sql
SELECT * FROM get_current_point_setting();
```

## 🔒 보안

- RLS (Row Level Security) 정책 적용
- 관리자만 포인트 설정 관리 가능
- 사용자는 자신의 포인트 내역만 조회 가능
- 서비스 역할 키를 사용한 안전한 API 호출

## 🐛 문제 해결

### 포인트가 자동 적립되지 않는 경우
1. 주문 상태가 `DELIVERED`인지 확인
2. 현재 날짜에 활성화된 포인트 설정이 있는지 확인
3. 데이터베이스 트리거가 활성화되어 있는지 확인:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_earn_points';
   ```

### 포인트 설정이 적용되지 않는 경우
1. 설정이 "활성화" 상태인지 확인
2. 시작일이 현재 날짜 이전인지 확인
3. 종료일이 설정되어 있다면 현재 날짜 이후인지 확인
4. 여러 설정이 있다면 우선순위 확인

## 📝 향후 개선 사항

- [ ] 포인트 사용 기능 (결제 시 포인트 차감)
- [ ] 포인트 내역 상세 조회 페이지
- [ ] 포인트 통계 대시보드
- [ ] 포인트 만료 알림 기능
- [ ] 모바일 앱 포인트 표시

## 📞 지원

문제가 발생하거나 질문이 있으시면 개발팀에 문의해주세요.

---

**작성일**: 2024-12-08
**버전**: 1.0.0

