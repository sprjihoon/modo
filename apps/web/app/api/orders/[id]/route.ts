import { NextResponse } from "next/server";

/**
 * PATCH /api/orders/[id] (DEPRECATED)
 *
 * 과거에는 CANCELLED → PENDING_PAYMENT 복구용으로 사용되었으나,
 * PENDING_PAYMENT 상태가 폐지되면서 의미가 사라짐.
 * 신규 흐름에서는 취소된 주문을 복구하지 않고, 새로 주문을 생성하도록 안내.
 */
export async function PATCH() {
  return NextResponse.json(
    {
      error:
        "주문 상태 변경 API 는 더 이상 사용되지 않습니다. 새 주문은 결제 흐름에서 생성해 주세요.",
      code: "ENDPOINT_REMOVED",
    },
    { status: 410 }
  );
}
