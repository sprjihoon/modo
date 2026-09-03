import {
  classifyOrderImage,
  collectOrderImagePaths,
  orderImagePathFromUrl,
  selectOrderImagesToDelete,
  summarizeOrderImages,
} from "./order-image-storage";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(
  orderImagePathFromUrl(
    "https://xx.supabase.co/storage/v1/object/public/order-images/repairs/a_1.jpg",
  ) === "repairs/a_1.jpg",
  "public URL path",
);
assert(
  orderImagePathFromUrl("orders/web-file.jpg") === "orders/web-file.jpg",
  "bare path",
);
assert(orderImagePathFromUrl("https://cdn.example/foo.jpg") === null, "other URL");

const paths = collectOrderImagePaths({
  images_with_pins: [{ imageUrl: "https://xx.supabase.co/storage/v1/object/public/order-images/orders/b.jpg" }],
  images: { urls: ["https://xx.supabase.co/storage/v1/object/public/order-images/repairs/c.jpg"] },
});
assert(paths.has("orders/b.jpg") && paths.has("repairs/c.jpg"), "collect nested");

const now = new Date("2026-09-03T00:00:00.000Z");
const file = { path: "repairs/old.jpg", createdAt: new Date("2026-06-01T00:00:00.000Z") };

const orderClass = classifyOrderImage(
  file,
  [{ path: "repairs/old.jpg", kind: "order", boundAt: new Date("2026-06-20T00:00:00.000Z") }],
  now,
);
assert(orderClass.kind === "order" && orderClass.expired, "주문 사진 60일 만료");

const freshOrder = classifyOrderImage(
  file,
  [{ path: "repairs/old.jpg", kind: "order", boundAt: new Date("2026-08-20T00:00:00.000Z") }],
  now,
);
assert(freshOrder.kind === "order" && !freshOrder.expired, "최근 주문은 유지");

const orphan = classifyOrderImage(file, [], now);
assert(orphan.kind === "orphan" && orphan.expired, "안 묶인 사진은 7일 후 만료");

const picked = selectOrderImagesToDelete([orderClass, orphan, freshOrder], "orphans");
assert(picked.length === 1 && picked[0].kind === "orphan", "버튼은 안 묶인 사진만");

const expired = selectOrderImagesToDelete([orderClass, orphan, freshOrder], "expired");
assert(expired.length === 1 && expired[0].kind === "order", "크론 만료는 묶인 사진만");

const summary = summarizeOrderImages([orderClass, orphan, freshOrder]);
assert(summary.orphans === 1 && summary.expiredBound === 1 && summary.orderBound === 2, "요약");

console.log("order-image-storage.test.ts ok");
