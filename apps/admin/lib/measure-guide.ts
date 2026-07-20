/** 치수 재는 방법 가이드 옵션 (고객 웹 MeasureGuideClient와 동일) */
export const MEASURE_GUIDE_OPTIONS = [
  { id: "sleeve-length", name: "소매기장 줄임" },
  { id: "shoulder", name: "어깨길이 줄임" },
  { id: "width-top", name: "전체 품 줄임 (상의, 원피스)" },
  { id: "total-length-top", name: "총 기장 줄임 (상의, 원피스)" },
  { id: "arm-width", name: "전체팔통 줄임" },
  { id: "total-length-bottom", name: "총 기장 줄임 (바지, 스커트)" },
  { id: "waist-hip", name: "허리/힙 줄임" },
  { id: "leg-width", name: "전체 통 줄임 (바지, 스커트)" },
  { id: "rise", name: "밑위 줄임" },
] as const;

export type MeasureGuideId = (typeof MEASURE_GUIDE_OPTIONS)[number]["id"];
