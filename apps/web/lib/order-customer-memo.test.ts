import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const webRoot = join(__dirname);
const repoRoot = join(__dirname, "../../..");
const read = (rel: string) => readFileSync(join(webRoot, rel), "utf8");
const readRepo = (rel: string) => readFileSync(join(repoRoot, rel), "utf8");

const pricing = read("order-pricing.ts");
assert(pricing.includes("customerMemo?: string"), "quote input keeps customerMemo");
assert(pricing.includes("customerMemo: string | null"), "pickup payload types customerMemo");
assert(
  /customerMemo:\s*typeof input\.customerMemo === "string"/.test(pricing),
  "quote copies trimmed customerMemo into the payment payload"
);
assert(
  !/notes:\s*input\.customerMemo/.test(pricing),
  "quote must not put 수선 메모 into 우체국 notes"
);

const pickup = read("../components/order/PickupStep.tsx");
assert(pickup.includes("수선 요청 메모"), "pickup form has 수선 요청 메모");
assert(pickup.includes("customerMemo: customerMemo.trim()"), "pickup saves memo on the draft");
assert(pickup.includes("배송 요청사항"), "pickup still has separate 배송 요청사항");

const free = read("../app/api/orders/free/route.ts");
assert(free.includes("customer_memo: p.customerMemo"), "0원 주문이 customer_memo를 저장");
assert(free.includes("notes: p.notes"), "0원 주문은 notes를 배송요청으로 유지");

const confirm = readRepo("apps/edge/supabase/functions/payments-confirm/index.ts");
assert(
  confirm.includes("customer_memo: pickup.customerMemo || null"),
  "결제 확정이 customer_memo를 주문에 넣는다"
);
assert(confirm.includes("notes: pickup.notes || null"), "결제 확정 notes는 배송요청만");

console.log("order-customer-memo.test.ts ok");
