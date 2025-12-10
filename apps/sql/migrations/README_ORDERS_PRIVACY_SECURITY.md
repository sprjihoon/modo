# 주문 데이터 프라이버시 및 접근 제어 보안 가이드

## 📋 개요

"모두의 수선" 고객용 앱에서 **주문 내역 조회** 시 강력한 데이터 보안 및 접근 제어를 적용했습니다.

## 🔒 핵심 보안 원칙

### 1. 소유자 기반 접근 제어 (Owner-based Access Control)
- **고객은 오직 자신이 생성한 주문(My Orders)만 조회 가능**
- 다른 고객의 주문 정보는 절대 조회 불가
- URL 조작이나 API 직접 호출로도 다른 사용자의 데이터 접근 불가

### 2. 다층 보안 구조 (Defense in Depth)

```
📱 Client (Flutter App)
    ↓
🔒 Application Layer (order_service.dart)
    ↓ userId 필터링 강제
🔒 Database Layer (Supabase RLS)
    ↓ auth.uid() 기반 검증
💾 Database (PostgreSQL)
```

## ✅ 적용된 보안 조치

### 1. 백엔드/DB 쿼리 로직 강화

#### ✨ OrderService.getMyOrders()
**파일**: `apps/mobile/lib/services/order_service.dart`

**변경 사항**:
```dart
// ❌ 이전 (보안 취약)
final response = await _supabase
    .from('orders')
    .select('*')
    .order('created_at', ascending: false);

// ✅ 현재 (보안 강화)
final userResponse = await _supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)  // 현재 로그인 사용자의 auth_id로 검색
    .maybeSingle();

final userId = userResponse['id'] as String;

final response = await _supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)  // 🔒 핵심: 본인 주문만!
    .order('created_at', ascending: false);
```

**보안 효과**:
- ✅ DB 쿼리 레벨에서 `user_id` 필터링 강제
- ✅ 프론트엔드가 아닌 **서버(DB)에서 필터링**
- ✅ 다른 사용자의 주문은 쿼리 결과에 포함되지 않음

---

#### ✨ OrderService.getOrderDetail()
**파일**: `apps/mobile/lib/services/order_service.dart`

**변경 사항**:
```dart
// ❌ 이전 (보안 취약)
final response = await _supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

// ✅ 현재 (보안 강화)
final userResponse = await _supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle();

final userId = userResponse['id'] as String;

final response = await _supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', userId)  // 🔒 핵심: 본인 주문만!
    .maybeSingle();

// 🔒 접근 권한 검증
if (response == null) {
  throw Exception('접근 권한이 없습니다. 본인의 주문만 조회할 수 있습니다.');
}
```

**보안 효과**:
- ✅ 주문 ID를 알아도 본인 소유가 아니면 접근 불가
- ✅ URL 조작 시도 차단 (예: `/orders/detail/other-user-order-id`)
- ✅ 403 Forbidden 에러 반환 (또는 null)

---

### 2. 상세 페이지 보안 (ID 조작 방지)

#### ✨ OrderDetailPage
**파일**: `apps/mobile/lib/features/orders/presentation/pages/order_detail_page.dart`

**변경 사항**:
```dart
// 🔒 보안: 주문 상세 정보 조회 (소유자 검증 포함)
final order = await _orderService.getOrderDetail(widget.orderId);

// 에러 처리: 접근 권한 없음
catch (e) {
  final errorMessage = e.toString();
  final isAccessDenied = errorMessage.contains('접근 권한이 없습니다');
  
  if (isAccessDenied) {
    // 🔒 즉시 뒤로가기 (보안 위협 차단)
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('⛔ 접근 권한이 없습니다. 본인의 주문만 조회할 수 있습니다.'),
        backgroundColor: Colors.red,
      ),
    );
    
    Future.delayed(const Duration(milliseconds: 500), () {
      context.pop(); // 즉시 뒤로가기
    });
  }
}
```

**보안 효과**:
- ✅ 접근 권한 없는 경우 에러 메시지 표시 후 즉시 뒤로가기
- ✅ 사용자 경험 개선 (명확한 에러 안내)
- ✅ 2차 방어선 (Application Layer 검증 실패 시 UI에서 차단)

---

### 3. Supabase RLS (Row Level Security) 정책

#### ✨ 데이터베이스 레벨 보안
**파일**: `apps/sql/migrations/add_orders_rls_customer_privacy.sql`

**적용된 정책**:

##### 📖 주문 조회 (SELECT)
```sql
CREATE POLICY "Customers can view own orders"
  ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = orders.user_id
        AND users.auth_id = auth.uid()
    )
  );
```

**보안 효과**:
- ✅ **PostgreSQL 레벨에서 강제 검증**
- ✅ 애플리케이션 코드를 우회해도 DB에서 차단
- ✅ `auth.uid()`와 `users.auth_id`가 일치하고, `users.id`와 `orders.user_id`가 일치하는 경우만 허용

##### 📝 주문 생성 (INSERT)
```sql
CREATE POLICY "Customers can insert own orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = orders.user_id
        AND users.auth_id = auth.uid()
    )
  );
```

**보안 효과**:
- ✅ 다른 사용자의 `user_id`로 주문 생성 시도 차단
- ✅ 본인의 `user_id`로만 주문 생성 가능

##### ✏️ 주문 수정 (UPDATE)
```sql
CREATE POLICY "Customers can update own orders"
  ON public.orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = orders.user_id
        AND users.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = orders.user_id
        AND users.auth_id = auth.uid()
    )
  );
```

**보안 효과**:
- ✅ 본인의 주문만 수정 가능
- ✅ 수정 후에도 본인 소유여야 함 (`user_id` 변경 불가)

##### 🗑️ 주문 삭제 (DELETE)
주문 삭제는 기본적으로 **비활성화**되어 있습니다. (운영 환경 권장)

필요한 경우 SQL 파일에서 주석을 제거하여 활성화할 수 있습니다.

##### 🔑 관리자 권한
관리자는 모든 주문에 대해 조회/생성/수정/삭제 권한을 가집니다.

```sql
CREATE POLICY "Admins can view all orders"
  ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );
```

##### 📦 배송 정보 (shipments) 보안
`shipments` 테이블도 동일한 보안 수준을 적용했습니다.

```sql
CREATE POLICY "Customers can view own shipments"
  ON public.shipments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      JOIN public.users ON users.id = orders.user_id
      WHERE orders.id = shipments.order_id
        AND users.auth_id = auth.uid()
    )
  );
```

---

## 🚀 적용 방법

### 1. SQL 마이그레이션 실행

```bash
# Supabase CLI 사용
supabase db push

# 또는 Supabase Dashboard에서 SQL Editor 사용
# apps/sql/migrations/add_orders_rls_customer_privacy.sql 파일 내용 복사 후 실행
```

### 2. Flutter 앱 재빌드 (선택적)

이미 코드는 수정되었으므로, 앱을 재시작하면 적용됩니다.

```bash
cd apps/mobile
flutter run
```

---

## 🧪 테스트 시나리오

### ✅ 정상 케이스

1. **본인 주문 목록 조회**
   - 결과: ✅ 본인이 생성한 주문만 표시됨
   - 로그: `✅ 조회된 주문 개수: N개`

2. **본인 주문 상세 조회**
   - 결과: ✅ 주문 상세 정보 정상 표시
   - 로그: `✅ 주문 조회 성공: <order_id>`

### ⛔ 비정상 케이스 (보안 위협)

1. **다른 사용자의 주문 ID로 접근 시도**
   ```dart
   // 예: /orders/detail/other-user-order-id
   ```
   - 결과: ⛔ 에러 메시지 표시 후 즉시 뒤로가기
   - 로그: `❌ 접근 권한 없음: orderId=..., userId=...`
   - UI: "⛔ 접근 권한이 없습니다. 본인의 주문만 조회할 수 있습니다."

2. **API 직접 호출로 다른 사용자 주문 조회 시도**
   ```dart
   await supabase
       .from('orders')
       .select('*')
       .eq('id', 'other-user-order-id')
       .single();
   ```
   - 결과: ⛔ RLS 정책에 의해 빈 결과 또는 403 Forbidden
   - 로그: `❌ 주문 상세 조회 실패: 접근 권한이 없습니다`

3. **다른 사용자의 user_id로 주문 생성 시도**
   ```dart
   await supabase
       .from('orders')
       .insert({'user_id': 'other-user-id', ...})
       .select();
   ```
   - 결과: ⛔ RLS 정책에 의해 INSERT 실패
   - 에러: `new row violates row-level security policy`

---

## 📊 보안 강화 요약

| 보안 계층 | 적용 위치 | 보안 조치 | 효과 |
|---------|---------|---------|------|
| **Application Layer** | `order_service.dart` | `userId` 필터링 강제 | ✅ 프론트엔드에서 다른 사용자 데이터 요청 차단 |
| **UI Layer** | `order_detail_page.dart` | 접근 권한 검증 및 즉시 뒤로가기 | ✅ 사용자 경험 개선 및 2차 방어 |
| **Database Layer** | Supabase RLS | `auth.uid()` 기반 소유자 검증 | ✅ DB 레벨에서 강제 검증 (최종 방어선) |

---

## 🔐 추가 권장 사항

### 1. 로깅 및 모니터링
- 접근 권한 위반 시도를 로깅하여 보안 위협 감지
- Supabase Realtime 또는 외부 모니터링 도구 연동 권장

### 2. 정기적인 보안 감사
- RLS 정책 정기 검토 (3개월마다)
- 코드 리뷰 시 보안 취약점 점검

### 3. 추가 보안 강화 (선택적)
- Rate Limiting: 과도한 API 호출 차단
- IP Whitelist: 특정 IP만 접근 허용 (관리자용)
- 2FA (Two-Factor Authentication): 중요 작업 시 2차 인증

---

## 📞 문의

보안 관련 문의나 버그 발견 시:
- 이슈 등록: [GitHub Issues](your-repo-issues-url)
- 이메일: security@modusrepair.com (예시)

---

## 📝 변경 이력

| 날짜 | 변경 사항 | 작성자 |
|-----|---------|--------|
| 2025-12-10 | 초기 보안 정책 적용 | AI Assistant |

---

**🔒 보안은 한 번에 끝나는 작업이 아닙니다. 지속적인 모니터링과 개선이 필요합니다!**

