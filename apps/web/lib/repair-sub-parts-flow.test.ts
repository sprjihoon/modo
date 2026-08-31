import {
  buildMeasureFieldGroups,
  canConfirmSubParts,
  detailFromMeasureGroup,
  mapApiSubParts,
  measureFieldCount,
  resolveAllOptionDisplayPrice,
  resolvePartInputLabels,
  resolveSubPartsConfirm,
  shouldAutoConfirmOnSubPartTap,
  shouldAutoProceedRepair,
} from "./repair-sub-parts-flow";
import { MOCK_PARENT_LABELS, MOCK_WAIST_HIP_PARTS } from "./repair-measure-mock";

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

assert(
  resolveAllOptionDisplayPrice({
    selectedMode: "all",
    allOptionPrice: 15000,
    typePrice: 8000,
  }) === 15000,
  "전체 선택 시 전체 옵션 가격 표시"
);
assert(
  resolveAllOptionDisplayPrice({
    selectedMode: "specific",
    allOptionPrice: 15000,
    typePrice: 8000,
  }) === null,
  "특정 부위 선택 시 전체 가격 숨김"
);
assert(
  resolveAllOptionDisplayPrice({
    selectedMode: "all",
    allOptionPrice: null,
    typePrice: 8000,
  }) === 8000,
  "전체 옵션 가격이 없으면 항목 가격 사용"
);
assert(
  resolveAllOptionDisplayPrice({
    selectedMode: "all",
    allOptionPrice: 0,
    typePrice: 0,
  }) === null,
  "가격이 없으면 표시하지 않음"
);

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

const parentLabels = ["줄일 길이 (cm)"];
assert(
  resolvePartInputLabels({ input_count: 1, input_labels: null }, parentLabels).join() ===
    "줄일 길이 (cm)",
  "부위 라벨이 없으면 상위 항목을 따른다",
);
assert(
  resolvePartInputLabels(
    { input_count: 2, input_labels: ["허리 (cm)", "힙 (cm)"] },
    parentLabels,
  ).join("|") === "허리 (cm)|힙 (cm)",
  "허리+힙은 부위 라벨 2개",
);

const groups = buildMeasureFieldGroups({
  fallbackLabels: parentLabels,
  parts: [
    { id: "combo", name: "허리+힙", input_count: 2, input_labels: ["허리 (cm)", "힙 (cm)"] },
    { id: "waist", name: "허리", input_count: 1, input_labels: null },
  ],
});
assert(groups.length === 2, "선택한 부위만큼 그룹");
assert(groups[0].labels.length === 2 && groups[1].labels.length === 1, "부위마다 칸 수가 다르다");
assert(measureFieldCount(groups) === 3, "전체 입력 칸은 3개");
assert(
  detailFromMeasureGroup(groups[0], ["3", "2", "1"], 0) === "허리 (cm): 3, 힙 (cm): 2",
  "콤보 상세는 두 값을 이어 붙인다",
);

const comboOnly = buildMeasureFieldGroups({
  fallbackLabels: MOCK_PARENT_LABELS,
  parts: MOCK_WAIST_HIP_PARTS.filter((part) => part.id === "combo"),
});
assert(comboOnly[0].labels.join("|") === "허리 (cm)|힙 (cm)", "목업 허리+힙 2칸");
const waistOnly = buildMeasureFieldGroups({
  fallbackLabels: MOCK_PARENT_LABELS,
  parts: MOCK_WAIST_HIP_PARTS.filter((part) => part.id === "waist"),
});
assert(waistOnly[0].labels.join() === "줄일 길이 (cm)", "목업 허리는 상위 라벨 1칸");

console.log("web repair-sub-parts-flow.test.ts: ok");
