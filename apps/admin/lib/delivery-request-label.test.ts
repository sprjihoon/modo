import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  printedDeliveryRequestForOrder,
  resolveDeliveryRequestMessage,
} from "./delivery-request";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const orderA = { notes: "현관 비번 1111", customer_memo: "안감 조심" };
const orderB = { notes: "경비실에 맡겨주세요", customer_memo: "단추 유지" };
const orderEmpty = { notes: "", customer_memo: "수선만 있음" };

assert(
  printedDeliveryRequestForOrder(orderA) === "현관 비번 1111",
  "A 주문 송장에는 A 고객이 적은 배송요청사항이 나와야 한다"
);
assert(
  printedDeliveryRequestForOrder(orderB) === "경비실에 맡겨주세요",
  "B 주문 송장에는 B 고객이 적은 배송요청사항이 나와야 한다"
);
assert(
  printedDeliveryRequestForOrder(orderA) !== printedDeliveryRequestForOrder(orderB),
  "다른 주문의 요청사항이 섞이면 안 된다"
);
assert(
  printedDeliveryRequestForOrder(orderA) !== orderA.customer_memo,
  "송장에는 수선 메모가 아니라 배송요청사항이 나와야 한다"
);
assert(
  printedDeliveryRequestForOrder(orderEmpty) === "",
  "해당 주문에 배송요청사항이 없으면 송장에도 비운다"
);
assert(
  printedDeliveryRequestForOrder(null) === "",
  "주문 없으면 빈 문자열"
);

const printedA = resolveDeliveryRequestMessage(orderA.notes);
assert(printedA === "현관 비번 1111", "인쇄 정규화도 같은 주문 notes를 쓴다");

const adminRoot = join(__dirname, "..");
const repoRoot = join(__dirname, "../../..");
const readAdmin = (rel: string) => readFileSync(join(adminRoot, rel), "utf8");
const readRepo = (rel: string) => readFileSync(join(repoRoot, rel), "utf8");

const printBindings: Array<{ rel: string; mustInclude: string }> = [
  { rel: "app/ops/reprint/page.tsx", mustInclude: "resolveDeliveryRequestMessage(order.notes)" },
  { rel: "app/ops/inbound/page.tsx", mustInclude: "resolveDeliveryRequestMessage(orderData.notes)" },
  {
    rel: "components/orders/label-print-dialog.tsx",
    mustInclude: "resolveDeliveryRequestMessage(order.notes ?? fullOrder?.notes)",
  },
];

for (const { rel, mustInclude } of printBindings) {
  const src = readAdmin(rel);
  assert(src.includes(mustInclude), `${rel}가 해당 주문의 notes를 송장에 넣어야 한다`);
  assert(!/deliveryMessage:\s*["']/.test(src), `${rel}가 배송요청사항을 고정 문구로 넣으면 안 된다`);
  assert(
    !/resolveDeliveryRequestMessage\(\s*(order|orderData)\.customer_memo/.test(src),
    `${rel}가 수선 메모를 송장 배송요청사항으로 쓰면 안 된다`
  );
}

const sheet = readAdmin("components/ops/shipping-label-sheet.tsx");
assert(
  sheet.includes('delivery_request: (data) => (data.deliveryMessage || "").trim()'),
  "송장 시트는 그 송장 데이터의 deliveryMessage를 찍어야 한다"
);
assert(
  !/delivery_request:\s*\(\)\s*=>\s*"/.test(sheet),
  "송장 시트가 배송요청사항을 고정 문구로 찍으면 안 된다"
);

const outbound = readRepo("apps/edge/supabase/functions/shipments-create-outbound/index.ts");
assert(outbound.includes("order.notes"), "출고 발급도 해당 주문의 notes를 delivMsg로 써야 한다");

console.log("delivery-request-label.test.ts ok");
