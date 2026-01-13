# 토스페이먼츠 결제 위젯 연동 가이드

## 📦 설치된 패키지

```bash
npm install @tosspayments/tosspayments-sdk --save
```

## 🗂️ 생성된 파일

```
apps/admin/
├── components/
│   └── payment/
│       └── TossPaymentWidget.tsx   # 결제 위젯 컴포넌트
├── app/
│   ├── pay/
│   │   ├── [id]/
│   │   │   └── page.tsx            # 결제 페이지 (위젯 연동)
│   │   ├── success/
│   │   │   └── page.tsx            # 결제 성공 페이지
│   │   └── fail/
│   │       └── page.tsx            # 결제 실패 페이지
│   └── api/
│       └── pay/
│           └── confirm/
│               └── route.ts        # 결제 승인 API
```

## 🔑 환경변수 설정

### 개발/테스트 환경

현재 테스트 키가 하드코딩되어 있어서 바로 테스트 가능합니다.

### 운영 환경

`.env.local` 또는 Vercel 환경변수에 다음을 추가하세요:

```env
# 토스페이먼츠 클라이언트 키 (브라우저에서 사용)
NEXT_PUBLIC_TOSS_CLIENT_KEY=live_gck_XXXXXXXX

# 토스페이먼츠 시크릿 키 (서버에서만 사용 - 절대 노출 금지!)
TOSS_SECRET_KEY=live_gsk_XXXXXXXX
```

> ⚠️ **중요**: 시크릿 키는 절대로 클라이언트 코드나 GitHub에 노출되면 안 됩니다!

### 키 확인 방법

1. [토스페이먼츠 개발자센터](https://developers.tosspayments.com/) 접속
2. 로그인 후 내 개발정보 > API 키 확인
3. 결제위젯 연동 키 사용

## 💳 테스트 키

| 키 종류 | 테스트 키 |
|--------|----------|
| 클라이언트 키 | `test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm` |
| 시크릿 키 | `test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6` |

## 🔄 결제 흐름

```
1. 고객이 결제 페이지 접근 (/pay/[orderId])
   ↓
2. "결제하고 진행하기" 클릭
   ↓
3. 토스페이먼츠 결제 위젯 표시
   ↓
4. 결제수단 선택 및 결제 진행
   ↓
5. 결제 인증 완료
   ↓
6. successUrl로 리다이렉트 (/pay/success)
   ↓
7. 서버에서 결제 승인 API 호출 (/api/pay/confirm)
   ↓
8. 토스페이먼츠 승인 API 호출
   ↓
9. DB 업데이트 및 결과 표시
```

## 🧪 테스트 방법

### 1. 개발 서버 실행

```bash
cd apps/admin
npm run dev
```

### 2. 테스트 페이지 접근

브라우저에서 `/pay/[extra_charge_request_id]` 접근

### 3. 테스트 결제

- 테스트 모드에서는 실제 결제가 이뤄지지 않습니다
- 카드 결제 시 아무 카드 번호나 입력해도 됩니다
- 테스트용 카드 번호: `4242-4242-4242-4242`

## 📝 지원 결제수단

- ✅ 신용・체크 카드
- ✅ 계좌이체 (퀵계좌이체)
- ✅ 간편결제 (토스페이, 카카오페이, 네이버페이 등)
- ✅ 휴대폰 결제
- ✅ 가상계좌
- ✅ 상품권

## ⚙️ 커스터마이징

### 결제 UI 변경

[토스페이먼츠 결제위젯 어드민](https://app.tosspayments.com/)에서 노코드로 변경 가능:
- 결제수단 순서
- 색상 테마
- 결제수단 활성화/비활성화

### 코드 수정

`components/payment/TossPaymentWidget.tsx`에서:
- 결제 금액 표시 형식
- 버튼 스타일
- 에러 처리 로직

## 🔧 트러블슈팅

### 결제 위젯이 안 보여요

1. 클라이언트 키가 올바른지 확인
2. 브라우저 콘솔에서 에러 확인
3. 네트워크 탭에서 SDK 로드 확인

### 결제 승인 실패

1. 시크릿 키가 올바른지 확인
2. 금액이 일치하는지 확인
3. 서버 로그 확인

### CORS 에러

토스페이먼츠 SDK는 자체적으로 CORS를 처리하므로 별도 설정 불필요

## 📚 참고 문서

- [토스페이먼츠 결제위젯 연동 가이드](https://docs.tosspayments.com/guides/v2/payment-widget/integration)
- [SDK 레퍼런스](https://docs.tosspayments.com/reference/widget-sdk)
- [에러 코드](https://docs.tosspayments.com/reference/error-codes)
- [웹훅 연동](https://docs.tosspayments.com/guides/webhook)

## 🔗 추가 구현된 API

### 웹훅 엔드포인트
```
POST /api/pay/webhook
```
- 가상계좌 입금 완료 알림 (`DEPOSIT_CALLBACK`)
- 결제 상태 변경 알림 (`PAYMENT_STATUS_CHANGED`)
- 지급대행 상태 변경 (`PAYOUT_STATUS_CHANGED`)

### 결제 취소 API
```
POST /api/pay/cancel
{
  "paymentKey": "tgen_20240101...",
  "cancelReason": "고객 요청",
  "cancelAmount": 5000  // 부분 취소 시 (선택)
}
```

### 결제 조회 API
```
GET /api/pay/inquiry?paymentKey=tgen_20240101...
GET /api/pay/inquiry?orderId=order_123
```

### 테스트 페이지
```
/pay/test
```
- 결제 위젯 테스트
- 결제 조회 테스트
- 결제 취소 테스트

## 🤖 MCP 서버 연동

Cursor에서 토스페이먼츠 관련 질문 시 더 정확한 답변을 받을 수 있습니다.

설정 파일: `~/.cursor/mcp.json`
```json
{
  "mcpServers": {
    "tosspayments-integration-guide": {
      "command": "npx",
      "args": ["-y", "@tosspayments/integration-guide-mcp@latest"]
    }
  }
}
```

## 🚀 다음 단계

1. **실서비스 준비**
   - 토스페이먼츠 전자결제 신청
   - 라이브 키 발급
   - 환경변수 설정

2. **웹훅 등록**
   - [토스페이먼츠 개발자센터](https://developers.tosspayments.com/)에서 웹훅 URL 등록
   - URL: `https://your-domain.com/api/pay/webhook`

3. **운영 테스트**
   - 실제 결제 테스트
   - 취소/환불 테스트

