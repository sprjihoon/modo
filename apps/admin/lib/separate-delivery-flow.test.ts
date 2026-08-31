import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const repoRoot = join(__dirname, "../../..");
const read = (rel: string) => readFileSync(join(repoRoot, rel), "utf8");

const inbound = read("apps/admin/app/ops/inbound/page.tsx");
assert(
  inbound.includes("resolveOutboundLabelRecipient"),
  "입고 출고송장은 배송지 결정 함수를 써야 한다"
);
assert(
  !inbound.includes("centerAddressPattern") && !inbound.includes("deliveryIsCenterAddress"),
  "입고 출고송장이 센터처럼 보인다고 수거지로 되돌리면 안 된다"
);

const reprint = read("apps/admin/app/ops/reprint/page.tsx");
assert(reprint.includes("resolveOutboundLabelRecipient"), "재출력도 배송지 결정 함수를 써야 한다");

const dialog = read("apps/admin/components/orders/label-print-dialog.tsx");
assert(dialog.includes("resolveOutboundLabelRecipient"), "주문 송장 다이얼로그도 배송지 결정 함수를 써야 한다");

const outboundBook = read("apps/edge/supabase/functions/shipments-create-outbound/index.ts");
assert(
  outboundBook.includes("const recAddr1 = order.delivery_address"),
  "출고 예약 수취인은 orders.delivery_address"
);
assert(
  !/recAddr1\s*=\s*shipment\.delivery_address/.test(outboundBook),
  "출고 예약이 shipments.delivery_address를 수취인으로 쓰면 안 된다"
);
assert(
  outboundBook.includes("order.notes") && outboundBook.includes("delivMsg"),
  "출고 예약 delivMsg는 고객 배송요청사항(orders.notes)을 써야 한다"
);
assert(
  !outboundBook.includes("delivMsg: '수선 완료품입니다. 확인 부탁드립니다.'"),
  "출고 예약 delivMsg를 고정 문구만 넣으면 안 된다"
);

const pickupBook = read("apps/edge/supabase/functions/shipments-book/index.ts");
const orderUpdate = pickupBook.slice(
  pickupBook.indexOf("// 주문 상태 업데이트"),
  pickupBook.indexOf("// 주문 상태 업데이트") + 280
);
assert(orderUpdate.includes("tracking_no: pickupTrackingNo"), "수거예약은 주문에 송장번호만 반영");
assert(orderUpdate.includes("status: 'BOOKED'"), "수거예약은 주문 상태만 BOOKED");
assert(!orderUpdate.includes("delivery_address:"), "수거예약이 주문 배송지를 센터로 덮으면 안 된다");

const pickupStep = read("apps/web/components/order/PickupStep.tsx");
assert(
  pickupStep.includes("resolvePickupDeliveryFields"),
  "웹 수거신청이 체크박스 주소 규칙을 공통 함수로 저장해야 한다"
);

const confirm = read("apps/edge/supabase/functions/payments-confirm/index.ts");
assert(
  confirm.includes("delivery_address: pickup.deliveryAddress || pickup.pickupAddress"),
  "결제 확정은 입력 배송지를 주문에 저장해야 한다"
);

const appPickup = read("apps/mobile/lib/features/orders/presentation/pages/pickup_request_page.dart");
assert(
  appPickup.includes("resolvePickupDelivery"),
  "앱 수거신청이 체크박스 주소 규칙을 공통 함수로 저장해야 한다"
);
assert(
  appPickup.includes("'pickupPhone': resolved.pickupPhone"),
  "체크 해제 시 수거지 연락처를 배송지 번호로 덮으면 안 된다"
);

console.log("separate-delivery-flow.test.ts passed");
