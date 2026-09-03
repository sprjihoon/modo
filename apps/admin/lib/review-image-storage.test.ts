import { reviewImagePathFromUrl, reviewImageStoragePaths } from "./review-image-storage";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const userId = "11111111-1111-1111-1111-111111111111";

assert(
  reviewImagePathFromUrl(
    `https://xx.supabase.co/storage/v1/object/public/review-images/${userId}/a.jpg`,
  ) === `${userId}/a.jpg`,
  "public review URL",
);
assert(
  reviewImagePathFromUrl("https://xx.supabase.co/storage/v1/object/public/order-images/repairs/a.jpg") === null,
  "order-images는 리뷰 사진이 아니다",
);
assert(
  reviewImageStoragePaths([
    `https://xx.supabase.co/storage/v1/object/public/review-images/${userId}/a.jpg`,
    "https://cdn.example/x.jpg",
  ]).join(",") === `${userId}/a.jpg`,
  "review paths only",
);

console.log("review-image-storage.test.ts ok");
