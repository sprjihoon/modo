import { customerRequestSummary } from "./work-order-images";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(
  customerRequestSummary({
    customer_memo: "안감 조심",
    notes: "현관 비번 1234",
    item_name: "바지 기장",
  }) === "안감 조심",
  "work order uses customer memo, not delivery notes"
);

assert(
  customerRequestSummary({
    notes: "현관 비번 1234",
    item_name: "바지 기장",
  }) === "바지 기장",
  "delivery notes stay off the work-order summary"
);

assert(
  customerRequestSummary({
    customer_memo: "단추 유지",
    repair_detail: "기장 줄임",
  }) === "단추 유지\n기장 줄임",
  "memo and repair detail both show"
);

assert(customerRequestSummary(null) === "수선 요청 정보 없음", "empty order");

console.log("work-order-images.test.ts ok");
