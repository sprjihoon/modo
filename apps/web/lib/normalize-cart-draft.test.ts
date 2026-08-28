import { normalizeStoredDraft } from "./normalize-cart-draft";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const newFlow = normalizeStoredDraft({
  items: [
    {
      clothingType: "바지",
      repairItems: [{ name: "기장 줄임", price: 8000, quantity: 1 }],
      imagesWithPins: [{ imageUrl: "https://example.com/a.jpg", pins: [] }],
    },
    {
      clothingType: "셔츠",
      repairItems: [
        { name: "소매 줄임", price: 5000, quantity: 1 },
        { name: "기장 줄임", price: 7000, quantity: 1 },
      ],
      imagesWithPins: [],
    },
  ],
  pickupAddress: "서울 강남구",
});

assert(newFlow.items.length === 2, "new-flow clothing count");
assert(newFlow.items[0].repairItems.length === 1, "first clothing repairs");
assert(newFlow.items[1].repairItems.length === 2, "second clothing repairs");
assert(newFlow.items[0].repairItems[0].name === "기장 줄임", "first repair name");
assert(newFlow.pickupAddress === "서울 강남구", "pickup kept");

const emptyItemsFallsBack = normalizeStoredDraft({
  items: [],
  clothingType: "코트",
  repairItems: [{ name: "단추 수선", price: 3000 }],
});
assert(emptyItemsFallsBack.items.length === 1, "empty items[] falls back");
assert(emptyItemsFallsBack.items[0].clothingType === "코트", "fallback clothing");
assert(emptyItemsFallsBack.items[0].repairItems[0].name === "단추 수선", "fallback repair");

const legacySingle = normalizeStoredDraft({
  clothingType: "원피스",
  repairItem: { repairPart: "기장 줄임", price: 12000, detail: "뒤 62cm" },
});
assert(legacySingle.items.length === 1, "legacy repairItem");
assert(legacySingle.items[0].repairItems[0].name === "기장 줄임", "legacy name");
assert(legacySingle.items[0].repairItems[0].detail === "뒤 62cm", "legacy detail");

const empty = normalizeStoredDraft({});
assert(empty.items.length === 0, "empty draft");

console.log("normalize-cart-draft.test.ts ok");
