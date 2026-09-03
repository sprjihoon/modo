import {
  reviewImagePathFromUrl,
  reviewImageStoragePaths,
  sanitizeReviewPhotoUrls,
  unusedReviewPhotoUrls,
} from "./reviews";

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
  reviewImagePathFromUrl(
    `https://xx.supabase.co/storage/v1/object/sign/review-images/${userId}/b.jpg?token=1`,
  ) === `${userId}/b.jpg`,
  "signed review URL",
);
assert(reviewImagePathFromUrl(`${userId}/c.jpg`) === `${userId}/c.jpg`, "bare review path");
assert(
  reviewImagePathFromUrl("https://xx.supabase.co/storage/v1/object/public/order-images/repairs/a.jpg") === null,
  "order-images는 리뷰 사진이 아니다",
);
assert(reviewImagePathFromUrl("https://cdn.example/x.jpg") === null, "other host");

const urls = [
  `https://xx.supabase.co/storage/v1/object/public/review-images/${userId}/keep.jpg`,
  `https://xx.supabase.co/storage/v1/object/public/review-images/${userId}/drop.jpg`,
];
assert(
  reviewImageStoragePaths(urls).join(",") === `${userId}/keep.jpg,${userId}/drop.jpg`,
  "review paths",
);
assert(sanitizeReviewPhotoUrls(urls).length === 2, "sanitize keeps review urls");
assert(
  unusedReviewPhotoUrls(urls, [urls[0]]).join(",") === urls[1],
  "수정에서 뺀 사진만 삭제 대상",
);

console.log("reviews.test.ts ok");
