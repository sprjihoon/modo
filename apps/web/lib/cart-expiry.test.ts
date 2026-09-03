import { CART_TTL_DAYS, isCartExpired, partitionExpiredCart } from "./cart-expiry";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const now = new Date("2026-09-04T00:00:00.000Z");

assert(CART_TTL_DAYS === 5, "ttl");
assert(!isCartExpired("2026-09-03T00:00:00.000Z", now), "4일 미만은 유지");
assert(!isCartExpired("2026-08-30T00:00:01.000Z", now), "거의 5일은 유지");
assert(isCartExpired("2026-08-30T00:00:00.000Z", now), "정확히 5일은 만료");
assert(isCartExpired("2026-08-20T00:00:00.000Z", now), "5일 초과는 만료");
assert(!isCartExpired("", now), "빈 날짜는 만료 아님");

const { keep, expired } = partitionExpiredCart(
  [
    { id: "keep", savedAt: "2026-09-02T00:00:00.000Z" },
    { id: "drop", savedAt: "2026-08-29T00:00:00.000Z" },
  ],
  (item) => item.savedAt,
  now,
);
assert(keep.map((i) => i.id).join(",") === "keep", "keep");
assert(expired.map((i) => i.id).join(",") === "drop", "expired");

console.log("cart-expiry.test.ts ok");
