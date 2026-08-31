import {
  buildRepairPhotoItems,
  buildRepairPhotoUrl,
  collectCustomerPhotoLookupKeys,
} from "./repair-photos";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const repairParts = [
  { name: "바지 기장 수선", price: 15000, quantity: 1, detail: "줄일 길이: 3cm" },
  { name: "허리 줄임", price: 20000, quantity: 1, detail: "줄일 길이: 2cm" },
  { name: "지퍼 교체", price: 18000, quantity: 1 },
];

assert(
  collectCustomerPhotoLookupKeys("A", "", null, "A", "B").join(",") === "A,B",
  "조회 키는 빈 값·중복을 제거한다",
);

assert(
  buildRepairPhotoUrl("https://cdn.example/a.jpg", "supabase", "https://sb") ===
    "https://cdn.example/a.jpg",
  "절대 URL은 그대로 쓴다",
);

assert(
  buildRepairPhotoUrl("data:image/svg+xml,x", "mock", "") === "data:image/svg+xml,x",
  "data URL은 그대로 쓴다",
);

assert(
  buildRepairPhotoUrl("ord-1/before_photo_1.jpg", "supabase", "https://sb.co") ===
    "https://sb.co/storage/v1/object/public/repair-photos/ord-1/before_photo_1.jpg",
  "supabase 상대경로는 public repair-photos URL로 만든다",
);

assert(
  buildRepairPhotoUrl("ord-1/before_photo_1.jpg", "s3", "https://sb.co") === undefined,
  "지원하지 않는 provider는 버린다",
);

const inbound = buildRepairPhotoItems({
  photos: [
    { type: "before_photo", path: "https://cdn.example/before-1.jpg", sequence: 1 },
    { type: "before_photo", path: "https://cdn.example/before-2.jpg", sequence: 2 },
  ],
  repairParts,
});
assert(inbound.length === 2, "입고만 있으면 2개 항목");
assert(inbound[0].label === "바지 기장 수선", "sequence 1 라벨은 repair_parts[0]");
assert(!!inbound[0].before && !inbound[0].after, "입고만 있으면 after 없음");

const mixed = buildRepairPhotoItems({
  photos: [
    { type: "before_photo", path: "https://cdn.example/before-1.jpg", sequence: 1 },
    { type: "after_photo", path: "https://cdn.example/after-1.jpg", sequence: 1 },
    { type: "before_photo", path: "https://cdn.example/before-2.jpg", sequence: 2 },
    { type: "before_photo", path: "https://cdn.example/before-3.jpg", sequence: 3 },
  ],
  repairParts,
});
assert(mixed.length === 3, "혼합 상태는 3개 항목");
assert(!!mixed[0].before && !!mixed[0].after, "1번은 전후 모두");
assert(!!mixed[1].before && !mixed[1].after, "2번은 후 대기");
assert(mixed[2].label === "지퍼 교체", "3번 라벨은 repair_parts[2]");

const unnamed = buildRepairPhotoItems({
  photos: [{ type: "before_photo", path: "https://x/a.jpg", sequence: 9 }],
  repairParts: [],
});
assert(unnamed[0].label === "수선 항목 9", "라벨이 없으면 수선 항목 N");

const empty = buildRepairPhotoItems({ photos: [], repairParts });
assert(empty.length === 0, "사진이 없으면 섹션 데이터도 비어 있다");

console.log("repair-photos.test.ts ok");
