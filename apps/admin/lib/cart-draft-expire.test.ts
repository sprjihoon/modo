import { CART_TTL_DAYS, cartExpireCutoff, isCartDraftExpired } from "./cart-draft-expire";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const now = new Date("2026-09-04T00:00:00.000Z");
assert(CART_TTL_DAYS === 5, "ttl");
assert(cartExpireCutoff(now).toISOString() === "2026-08-30T00:00:00.000Z", "cutoff");
assert(!isCartDraftExpired("2026-08-30T00:00:01.000Z", now), "5일 직전은 유지");
assert(isCartDraftExpired("2026-08-30T00:00:00.000Z", now), "5일 지난 장바구니는 만료");

console.log("cart-draft-expire.test.ts ok");
