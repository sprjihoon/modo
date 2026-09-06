import {
  MAX_ORDER_IMAGE_BYTES,
  MAX_ORDER_IMAGES,
  imageUrlsNotIn,
  isAllowedOrderImageFile,
  orderImageExtension,
  planOrderImageUpload,
} from "./order-image-upload";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(MAX_ORDER_IMAGES === 5, "max 5 photos");
assert(orderImageExtension("coat.PNG") === "png", "ext lower");
assert(orderImageExtension("photo") === "jpg", "missing ext");
assert(orderImageExtension("note.txt") === "jpg", "unknown ext fallback");

assert(
  isAllowedOrderImageFile({ type: "image/jpeg", name: "a.jpg", size: 1200 }),
  "jpeg ok",
);
assert(
  isAllowedOrderImageFile({ type: "", name: "a.heic", size: 1200 }),
  "heic by ext",
);
assert(
  !isAllowedOrderImageFile({ type: "application/pdf", name: "a.pdf", size: 1200 }),
  "pdf rejected",
);
assert(
  !isAllowedOrderImageFile({ type: "image/jpeg", name: "a.jpg", size: 0 }),
  "empty rejected",
);
assert(
  !isAllowedOrderImageFile({
    type: "image/jpeg",
    name: "a.jpg",
    size: MAX_ORDER_IMAGE_BYTES + 1,
  }),
  "oversize rejected",
);

const first = planOrderImageUpload(
  [
    { type: "image/jpeg", name: "1.jpg", size: 10 },
    { type: "image/png", name: "2.png", size: 10 },
    { type: "application/pdf", name: "x.pdf", size: 10 },
  ],
  0,
);
assert(first.accepted.length === 2, "accept two images");
assert(first.rejectedType === 1, "reject pdf");
assert(first.rejectedExtra === 0, "no overflow yet");

const overflow = planOrderImageUpload(
  [
    { type: "image/jpeg", name: "1.jpg", size: 10 },
    { type: "image/jpeg", name: "2.jpg", size: 10 },
    { type: "image/jpeg", name: "3.jpg", size: 10 },
  ],
  3,
  1,
);
assert(overflow.remainingSlots === 1, "reserved slot counted");
assert(overflow.accepted.length === 1, "only one slot left");
assert(overflow.rejectedExtra === 2, "extra images dropped");

const full = planOrderImageUpload(
  [{ type: "image/jpeg", name: "1.jpg", size: 10 }],
  5,
);
assert(full.accepted.length === 0 && full.remainingSlots === 0, "full rejects all");

assert(
  imageUrlsNotIn(["a", "b", "c"], ["b"]).join(",") === "a,c",
  "orphan urls",
);

console.log("order-image-upload.test.ts ok");
