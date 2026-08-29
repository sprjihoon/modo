import {
  clothingFilterValues,
  clothingTypeFromSummary,
  normalizeClothingType,
  resolveClothingType,
} from "./reviews";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(normalizeClothingType(" 바지 ") === "바지", "trim clothing");
assert(normalizeClothingType("점퍼") === "아우터", "jumper alias");
assert(normalizeClothingType("코트") === "아우터", "coat alias");
assert(normalizeClothingType("스커트") === "치마", "skirt alias");
assert(normalizeClothingType("") === null, "empty clothing");

assert(clothingTypeFromSummary("바지 · 기장수선") === "바지", "summary pants");
assert(clothingTypeFromSummary("점퍼 · 지퍼수선") === "아우터", "summary jumper");
assert(clothingTypeFromSummary("스커트 · 허리수선") === "치마", "summary skirt");

assert(resolveClothingType({ clothing_type: "청바지" }) === "청바지", "order clothing");
assert(resolveClothingType({ clothing_type: "점퍼" }) === "아우터", "order alias");
assert(
  resolveClothingType({ item_name: "코트 · 단추수선" }) === "아우터",
  "item name fallback",
);

const outer = clothingFilterValues("아우터");
assert(outer.includes("아우터") && outer.includes("점퍼") && outer.includes("코트"), "outer aliases");

console.log("clothing-type.test.ts ok");
