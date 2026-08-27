import { measurementLinesFromParts, parseRepairPart } from "./repair-parts";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const fromJson = parseRepairPart(
  '{"name":"어깨줄임","price":15000,"quantity":1,"detail":"왼쪽어깨: 10, 오른쪽어깨: 12"}'
);
assert(fromJson.name === "어깨줄임", "JSON 문자열 이름");
assert(fromJson.detail === "왼쪽어깨: 10, 오른쪽어깨: 12", "JSON 문자열 수치");
assert(fromJson.price === 15000, "JSON 문자열 가격");

const fromObj = parseRepairPart({
  name: "허리줄임",
  price: 12000,
  quantity: 1,
  detail: "허리: 30",
});
assert(fromObj.name === "허리줄임", "객체 이름");
assert(fromObj.detail === "허리: 30", "객체 수치");

const plain = parseRepairPart("소매기장 줄임");
assert(plain.name === "소매기장 줄임", "평문 이름");
assert(plain.detail === undefined, "평문은 수치 없음");

const emptyDetail = parseRepairPart({ name: "단추달기", detail: "  " });
assert(emptyDetail.detail === undefined, "공백 detail 은 없음으로 취급");

const lines = measurementLinesFromParts([
  { name: "어깨줄임", detail: "왼쪽어깨: 10" },
  "소매기장 줄임",
  '{"name":"허리줄임","detail":"허리: 28"}',
]);
assert(lines.length === 2, "수치가 있는 항목만");
assert(lines[0].name === "어깨줄임" && lines[0].detail === "왼쪽어깨: 10", "첫 수치");
assert(lines[1].name === "허리줄임" && lines[1].detail === "허리: 28", "JSON 수치");

assert(measurementLinesFromParts([]).length === 0, "빈 배열");
assert(measurementLinesFromParts(null).length === 0, "null");

const fromOldApp = parseRepairPart({
  name: "어깨줄임",
  price: 15000,
  quantity: 1,
  scope: "전체",
  measurement: "왼쪽: 2",
});
assert(fromOldApp.detail === "전체 / 왼쪽: 2", "옛 앱 필드도 작업지시서 수치로");

console.log("repair-parts.test.ts: ok");
