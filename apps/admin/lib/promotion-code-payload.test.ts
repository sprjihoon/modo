import {
  asIncludesFreeShipping,
  buildPromotionInsert,
  buildPromotionUpdate,
} from "./promotion-code-payload";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(asIncludesFreeShipping(true) === true, "true");
assert(asIncludesFreeShipping("true") === true, '"true"');
assert(asIncludesFreeShipping(1) === true, "1");
assert(asIncludesFreeShipping("1") === true, '"1"');
assert(asIncludesFreeShipping(false) === false, "false");
assert(asIncludesFreeShipping("false") === false, '"false"');
assert(asIncludesFreeShipping(undefined) === false, "undefined → false");

const created = buildPromotionInsert({
  code: "welcome",
  discount_type: "PERCENTAGE",
  discount_value: 100,
  max_uses_per_user: 1,
  includes_free_shipping: true,
});
assert(
  !("error" in created) &&
    created.code === "WELCOME" &&
    created.includes_free_shipping === true,
  "생성 시 배송비 무료 플래그 저장"
);

const createdOff = buildPromotionInsert({
  code: "SALE10",
  discount_type: "FIXED",
  discount_value: 5000,
  max_uses_per_user: 1,
});
assert(
  !("error" in createdOff) && createdOff.includes_free_shipping === false,
  "플래그 없으면 OFF"
);

const updated = buildPromotionUpdate({ includes_free_shipping: true });
assert(
  !("error" in updated) && updated.includes_free_shipping === true,
  "수정 시 플래그 ON"
);

const updatedOff = buildPromotionUpdate({ includes_free_shipping: false });
assert(
  !("error" in updatedOff) && updatedOff.includes_free_shipping === false,
  "수정 시 플래그 OFF"
);

const noFlag = buildPromotionUpdate({ is_active: true });
assert(
  !("error" in noFlag) && noFlag.includes_free_shipping === undefined,
  "다른 필드만 바꾸면 플래그를 덮어쓰지 않음"
);

console.log("promotion-code-payload.test.ts ok");
