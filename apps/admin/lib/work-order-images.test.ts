import { customerRequestSummary, parseWorkOrderImages } from "./work-order-images";

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

const parsed = parseWorkOrderImages({
  images_with_pins: [
    {
      imageUrl: "https://xx.supabase.co/storage/v1/object/public/order-images/orders/a.jpg",
      coordSpace: "image",
      pins: [{ relative_x: 0.2, relative_y: 0.8, memo: "밑단" }],
    },
    {
      imagePath: "https://xx.supabase.co/storage/v1/object/public/order-images/orders/b.jpg",
      pins: [{ x: 0.5, y: 0.5, memo: "소매" }],
    },
  ],
});
assert(parsed.length === 2, "two photos");
assert(parsed[0].coordSpace === "image", "new photo keeps image space");
assert(parsed[0].pins?.[0].memo === "밑단", "pin memo");
assert(parsed[0].pins?.[0].x === 0.2 && parsed[0].pins?.[0].y === 0.8, "relative coords");
assert(parsed[1].coordSpace === undefined, "legacy photo has no coordSpace");
assert(parsed[1].pins?.[0].x === 0.5, "legacy x/y");

console.log("work-order-images.test.ts ok");
