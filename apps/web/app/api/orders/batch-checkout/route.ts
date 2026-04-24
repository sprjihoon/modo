import { NextResponse } from "next/server";

/**
 * POST /api/orders/batch-checkout (DEPRECATED)
 *
 * PENDING_PAYMENT 상태가 폐지되면서 합포장 결제 사전 준비 단계도 함께 제거됨.
 * 신규 흐름:
 *   - 주문 생성 시 결제까지 한 번에 진행 (POST /api/orders/quote → /payment)
 *   - 합포장이 필요하면 주문 생성 단계에서 여러 의류를 한 주문으로 묶어 생성
 *
 * 레거시 호출이 들어오면 410 Gone 으로 응답.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "이 엔드포인트는 더 이상 사용되지 않습니다. 새 주문은 결제 흐름에서 직접 진행해 주세요.",
      code: "ENDPOINT_REMOVED",
    },
    { status: 410 }
  );
}
