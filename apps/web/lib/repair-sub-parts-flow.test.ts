import {
  canConfirmSubParts,
  mapApiSubParts,
  resolveSubPartsConfirm,
  shouldAutoConfirmOnSubPartTap,
  shouldAutoProceedRepair,
} from "./repair-sub-parts-flow";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const parts = [
  { id: "a", name: "기본형", price: 0 },
  { id: "b", name: "지퍼형", price: 0 },
];

assert(
  shouldAutoConfirmOnSubPartTap(false) === true,
  "단일 선택 항목은 탭 즉시 확인"
);
assert(
  shouldAutoConfirmOnSubPartTap(true) === false,
  "다중 선택은 확인 버튼 유지"
);

assert(canConfirmSubParts("all", 0) === true, "전체 모드는 바로 확인 가능");
assert(canConfirmSubParts("specific", 0) === false, "특정 부위 미선택이면 확인 불가");
assert(canConfirmSubParts("specific", 1) === true, "특정 부위 선택 후 확인 가능");

const noop = resolveSubPartsConfirm({
  mode: "specific",
  selectedIds: [],
  subParts: parts,
  requiresMeasurement: true,
  typePrice: 0,
});
assert(noop.kind === "noop", "미선택 확인은 no-op");

const pantsLength = resolveSubPartsConfirm({
  mode: "specific",
  selectedIds: ["a"],
  subParts: parts,
  requiresMeasurement: true,
  typePrice: 0,
});
assert(pantsLength.kind === "measure-parts", "기장 줄임(단일+치수)은 치수 단계로");
if (pantsLength.kind === "measure-parts") {
  assert(pantsLength.parts[0].name === "기본형", "선택한 세부부위 유지");
}

const accessory = resolveSubPartsConfirm({
  mode: "specific",
  selectedIds: ["a", "b"],
  subParts: parts,
  requiresMeasurement: false,
  typePrice: 0,
});
assert(accessory.kind === "add-parts", "부속품 수선은 치수 없이 바로 담기");
if (accessory.kind === "add-parts") {
  assert(accessory.parts.length === 2, "다중 선택 유지");
}

const allMeasure = resolveSubPartsConfirm({
  mode: "all",
  selectedIds: [],
  subParts: parts,
  requiresMeasurement: true,
  typePrice: 0,
  allOptionPrice: 10000,
});
assert(allMeasure.kind === "measure-all", "전체+치수는 치수 단계");
if (allMeasure.kind === "measure-all") {
  assert(allMeasure.overridePrice === 10000, "전체 옵션 가격");
}

const mapped = mapApiSubParts([
  { id: "1", name: "알통", price: "5000", part_type: "sub_part" },
  { id: 2, name: "옵션", price: 1, part_type: "option" },
  { id: "3", name: "예전데이터", price: 0 },
]);
assert(mapped.length === 2, "option 제외, part_type 없는 행은 포함");
assert(mapped[0].id === "1" && mapped[0].price === 5000, "id/price 정규화");
assert(mapped[1].id === "3", "null part_type 포함");

assert(
  shouldAutoProceedRepair({
    repairTypeCount: 1,
    selectedCount: 1,
    inSubParts: false,
    inMeasure: false,
  }) === true,
  "수선항목 1개면 선택 후 자동 다음"
);
assert(
  shouldAutoProceedRepair({
    repairTypeCount: 1,
    selectedCount: 1,
    inSubParts: true,
    inMeasure: false,
  }) === false,
  "세부부위 화면에서는 자동 다음 금지"
);

console.log("web repair-sub-parts-flow.test.ts: ok");
