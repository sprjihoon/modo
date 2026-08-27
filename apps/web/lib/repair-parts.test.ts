import {
  measurementLinesFromParts,
  parseRepairPart,
  repairItemDetail,
  toQuoteRepairItem,
} from "./repair-parts";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(
  repairItemDetail({ name: "소매기장 줄임", detail: "줄일 길이 (cm): 3" }) ===
    "줄일 길이 (cm): 3",
  "직접가격 치수"
);

assert(
  toQuoteRepairItem({
    name: "소매기장 줄임",
    price: 15000,
    detail: "줄일 길이 (cm): 3",
  }).detail === "줄일 길이 (cm): 3",
  "수선유형 단독 치수"
);

assert(
  toQuoteRepairItem({
    name: "어깨줄임",
    price: 20000,
    detail: "왼쪽어깨 (cm): 1, 오른쪽어깨 (cm): 1",
  }).detail === "왼쪽어깨 (cm): 1, 오른쪽어깨 (cm): 1",
  "전체 옵션 + 치수"
);

const left = toQuoteRepairItem({
  name: "어깨줄임 - 왼쪽어깨",
  price: 12000,
  detail: "줄일 길이 (cm): 2",
});
const right = toQuoteRepairItem({
  name: "어깨줄임 - 오른쪽어깨",
  price: 12000,
  detail: "줄일 길이 (cm): 1.5",
});
assert(left.detail === "줄일 길이 (cm): 2", "세부부위 왼쪽");
assert(right.detail === "줄일 길이 (cm): 1.5", "세부부위 오른쪽");

assert(
  repairItemDetail({
    repairPart: "어깨줄임",
    detailedMeasurements: [{ part: "왼쪽어깨", value: "2" }],
  }) === "왼쪽어깨: 2",
  "옛 detailedMeasurements"
);

assert(
  toQuoteRepairItem({ name: "단추달기", price: 5000 }).detail === undefined,
  "치수 없는 항목은 detail 생략"
);

const lines = measurementLinesFromParts([
  { name: "어깨줄임", detail: "왼쪽어깨: 10" },
  "소매기장 줄임",
  '{"name":"허리줄임","detail":"허리: 28"}',
]);
assert(lines.length === 2, "수치가 있는 항목만");
assert(parseRepairPart("소매기장 줄임").detail === undefined, "평문은 수치 없음");

console.log("web repair-parts.test.ts: ok");
