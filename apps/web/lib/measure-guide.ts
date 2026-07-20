/** 치수 재는 방법 가이드 타입 (MeasureGuideClient TYPES와 동기화) */
export const MEASURE_GUIDE_OPTIONS = [
  { id: "sleeve-length", name: "소매기장 줄임", clothing: "top" as const },
  { id: "shoulder", name: "어깨길이 줄임", clothing: "top" as const },
  { id: "width-top", name: "전체 품 줄임 (상의, 원피스)", clothing: "top" as const },
  { id: "total-length-top", name: "총 기장 줄임 (상의, 원피스)", clothing: "top" as const },
  { id: "arm-width", name: "전체팔통 줄임", clothing: "top" as const },
  { id: "total-length-bottom", name: "총 기장 줄임 (바지, 스커트)", clothing: "bottom" as const },
  { id: "waist-hip", name: "허리/힙 줄임", clothing: "bottom" as const },
  { id: "leg-width", name: "전체 통 줄임 (바지, 스커트)", clothing: "bottom" as const },
  { id: "rise", name: "밑위 줄임", clothing: "bottom" as const },
] as const;

export type MeasureGuideId = (typeof MEASURE_GUIDE_OPTIONS)[number]["id"];

const VALID_IDS = new Set(MEASURE_GUIDE_OPTIONS.map((o) => o.id));

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").replace(/[-_/]/g, "");
}

function clothingHintIsBottom(hint?: string | null) {
  if (!hint) return false;
  const n = normalize(hint);
  return (
    n.includes("바지") ||
    n.includes("스커트") ||
    n.includes("치마") ||
    n.includes("하의") ||
    n.includes("bottom") ||
    n.includes("pants") ||
    n.includes("skirt") ||
    n.includes("shorts") ||
    n.includes("반바지")
  );
}

function clothingHintIsTop(hint?: string | null) {
  if (!hint) return false;
  const n = normalize(hint);
  return (
    n.includes("상의") ||
    n.includes("자켓") ||
    n.includes("재킷") ||
    n.includes("코트") ||
    n.includes("셔츠") ||
    n.includes("블라우스") ||
    n.includes("니트") ||
    n.includes("티셔츠") ||
    n.includes("원피스") ||
    n.includes("아우터") ||
    n.includes("top") ||
    n.includes("jacket") ||
    n.includes("coat") ||
    n.includes("shirt") ||
    n.includes("dress")
  );
}

/**
 * DB에 저장된 key 우선, 없으면 이름/의류 힌트로 추정.
 */
export function resolveMeasureGuideId(
  itemName?: string | null,
  options?: {
    measureGuideKey?: string | null;
    clothingHint?: string | null;
  }
): MeasureGuideId | null {
  const key = options?.measureGuideKey?.trim();
  if (key && VALID_IDS.has(key as MeasureGuideId)) {
    return key as MeasureGuideId;
  }

  const hints = [itemName, options?.clothingHint].filter(Boolean).join(" ");
  if (!hints.trim()) return null;

  const n = normalize(hints);
  const isBottom =
    clothingHintIsBottom(options?.clothingHint) ||
    clothingHintIsBottom(itemName) ||
    n.includes("바지") ||
    n.includes("스커트") ||
    n.includes("치마");
  const isTop =
    !isBottom &&
    (clothingHintIsTop(options?.clothingHint) ||
      clothingHintIsTop(itemName) ||
      n.includes("상의") ||
      n.includes("원피스"));

  // 구체적 키워드 우선
  if (n.includes("소매기장") || n.includes("소매길이") || n.includes("sleeve")) {
    return "sleeve-length";
  }
  if (n.includes("소매") && (n.includes("줄임") || n.includes("기장") || n.includes("길이"))) {
    return "sleeve-length";
  }
  if (n.includes("어깨")) return "shoulder";
  if (n.includes("팔통") || (n.includes("arm") && n.includes("width"))) return "arm-width";
  if (n.includes("밑위") || n.includes("rise") || n.includes("가랑이")) return "rise";

  // 상의 전체품(허리 포함 표기)은 waist-hip보다 우선
  if (
    n.includes("전체품") ||
    n.includes("품줄임") ||
    (n.includes("품") && !n.includes("팔통") && !n.includes("힙"))
  ) {
    return "width-top";
  }

  // 허리/힙/엉덩이 (바지·치마·청바지 공통)
  if (
    n.includes("허리힙") ||
    n.includes("허리") ||
    n.includes("힙") ||
    n.includes("엉덩이") ||
    n.includes("히프") ||
    n.includes("hip") ||
    n.includes("waist")
  ) {
    return "waist-hip";
  }
  if (
    n.includes("전체통") ||
    n.includes("통줄임") ||
    n.includes("바지통") ||
    n.includes("스커트통") ||
    (n.includes("통") && isBottom && !n.includes("팔통"))
  ) {
    return "leg-width";
  }
  if (
    n.includes("총기장") ||
    n.includes("기장줄임") ||
    n.includes("밑단") ||
    (n.includes("기장") && !n.includes("소매"))
  ) {
    if (isBottom) return "total-length-bottom";
    if (isTop) return "total-length-top";
    // 의류 힌트가 없으면 항목명만으로 추정 (하의 키워드 없을 때 상의 기본)
    return isBottom ? "total-length-bottom" : "total-length-top";
  }

  return null;
}
