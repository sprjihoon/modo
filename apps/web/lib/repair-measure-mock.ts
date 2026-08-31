import type { SubPartLike } from "./repair-sub-parts-flow";

export const MOCK_PARENT_LABELS = ["줄일 길이 (cm)"];

export const MOCK_WAIST_HIP_PARTS: SubPartLike[] = [
  {
    id: "combo",
    name: "허리+힙",
    price: 20000,
    input_count: 2,
    input_labels: ["허리 (cm)", "힙 (cm)"],
  },
  {
    id: "waist",
    name: "허리",
    price: 20000,
    input_count: 1,
    input_labels: null,
  },
  {
    id: "hip",
    name: "힙",
    price: 20000,
    input_count: 1,
    input_labels: null,
  },
];

export type MeasureDemoScenarioId = "combo" | "waist" | "mixed";

export const MEASURE_DEMO_SCENARIOS: Array<{
  id: MeasureDemoScenarioId;
  title: string;
  summary: string;
  partIds: string[];
}> = [
  {
    id: "combo",
    title: "허리+힙",
    summary: "콤보는 허리·힙 칸이 두 개 뜹니다.",
    partIds: ["combo"],
  },
  {
    id: "waist",
    title: "허리만",
    summary: "부위 라벨이 없으면 상위 항목 라벨 한 칸을 씁니다.",
    partIds: ["waist"],
  },
  {
    id: "mixed",
    title: "허리+힙 + 허리",
    summary: "한 주문에 콤보와 단품을 같이 고르면 칸 수가 항목마다 다릅니다.",
    partIds: ["combo", "waist"],
  },
];
