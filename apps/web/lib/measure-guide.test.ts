import { resolveMeasureGuideId, type MeasureGuideId } from "./measure-guide";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function expectGuide(
  itemName: string,
  clothingHint: string,
  expected: MeasureGuideId,
  measureGuideKey?: string
) {
  const got = resolveMeasureGuideId(itemName, { clothingHint, measureGuideKey });
  assert(
    got === expected,
    `${clothingHint} / ${itemName}${measureGuideKey ? ` (key=${measureGuideKey})` : ""} → ${expected}, got ${got}`
  );
}

const WRONG_TOP_KEY = "total-length-top";
const WRONG_SLEEVE_KEY = "sleeve-length";

const TOP_ITEMS: Array<[string, MeasureGuideId]> = [
  ["소매기장 줄임", "sleeve-length"],
  ["소매기장 줄임 - 기본형", "sleeve-length"],
  ["소매기장 줄임 - 단추구멍형", "sleeve-length"],
  ["전체팔통 줄임", "arm-width"],
  ["어깨길이 줄임", "shoulder"],
  ["전체품 줄임", "width-top"],
  ["총기장 줄임", "total-length-top"],
  ["총기장 줄임 - 기본형", "total-length-top"],
];

const BOTTOM_ITEMS: Array<[string, MeasureGuideId]> = [
  ["허리/밑 줄임", "waist-hip"],
  ["전체통 줄임", "leg-width"],
  ["밑통만 줄임", "leg-width"],
  ["밑위(기장이) 줄임", "rise"],
  ["기장 줄임 - 일반형", "total-length-bottom"],
  ["기장 줄임 - 기본형", "total-length-bottom"],
  ["기장 줄임 - 투턱형(3cm)", "total-length-bottom"],
  ["기장+밑통 줄임", "length-leg-width"],
];

for (const clothing of ["티셔츠/맨투맨", "셔츠/블라우스", "원피스", "아우터"]) {
  for (const [name, expected] of TOP_ITEMS) {
    expectGuide(name, clothing, expected);
    expectGuide(name, clothing, expected, WRONG_SLEEVE_KEY);
  }
}

for (const clothing of ["바지", "청바지", "치마"]) {
  for (const [name, expected] of BOTTOM_ITEMS) {
    if (clothing === "치마" && name.includes("밑위")) continue;
    expectGuide(name, clothing, expected);
    expectGuide(name, clothing, expected, WRONG_TOP_KEY);
  }
}

expectGuide("기장 줄임", "바지", "total-length-bottom", WRONG_TOP_KEY);
expectGuide("기장 줄임", "청바지", "total-length-bottom", WRONG_TOP_KEY);
expectGuide("기장 줄임", "치마", "total-length-bottom", WRONG_TOP_KEY);
expectGuide("기장 줄임", "스커트", "total-length-bottom", WRONG_TOP_KEY);

expectGuide("소매기장 줄임", "정장/수트", "sleeve-length");
expectGuide("어깨길이 줄임", "정장/수트", "shoulder");
expectGuide("전체품 줄임", "정장/수트", "width-top");
expectGuide("총기장 줄임", "정장/수트", "total-length-top");
expectGuide("기장 줄임 - 일반형", "정장/수트", "total-length-bottom");
expectGuide("허리/밑 줄임", "정장/수트", "waist-hip");
expectGuide("전체통 줄임", "정장/수트", "leg-width");

assert(
  resolveMeasureGuideId("아무거나", { measureGuideKey: "sleeve-length" }) === "sleeve-length",
  "uses DB key when name cannot infer"
);

assert(resolveMeasureGuideId("기장 줄임") === "total-length-bottom", "defaults 기장 줄임 to bottom");
assert(resolveMeasureGuideId("총기장 줄임") === "total-length-top", "defaults 총기장 to top");

assert(
  resolveMeasureGuideId("어깨길이 줄임", {
    measureGuideKey: "sleeve-length",
    clothingHint: "티셔츠/맨투맨",
  }) === "shoulder",
  "name wins over wrong category key"
);

assert(
  resolveMeasureGuideId("허리/밑 줄임", {
    measureGuideKey: "total-length-bottom",
    clothingHint: "바지",
  }) === "waist-hip",
  "waist is not shown as length guide"
);

console.log("measure-guide.test.ts ok");
