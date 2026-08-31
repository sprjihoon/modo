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
  /** 복합: 총기장 + 전체 통 가이드를 모두 선택 가능 */
  {
    id: "length-leg-width",
    name: "기장 + 밑통 줄임 (바지, 스커트)",
    clothing: "bottom" as const,
  },
] as const;

export type MeasureGuideId = (typeof MEASURE_GUIDE_OPTIONS)[number]["id"];

/** 복합 가이드 → 실제 콘텐츠 타입 ID들 */
export const COMPOSITE_MEASURE_GUIDES: Record<string, readonly string[]> = {
  "length-leg-width": ["total-length-bottom", "leg-width"],
};

const VALID_IDS = new Set(MEASURE_GUIDE_OPTIONS.map((o) => o.id));
const CONTENT_TYPE_IDS = new Set(
  MEASURE_GUIDE_OPTIONS.map((o) => o.id).filter((id) => !COMPOSITE_MEASURE_GUIDES[id])
);

/** 가이드 키를 MeasureGuideClient가 보여줄 타입 ID 목록으로 펼침 */
export function expandMeasureGuideTypeIds(guideId?: string | null): string[] {
  if (!guideId?.trim()) return [];
  const key = guideId.trim();
  if (COMPOSITE_MEASURE_GUIDES[key]) {
    return [...COMPOSITE_MEASURE_GUIDES[key]];
  }
  if (CONTENT_TYPE_IDS.has(key as MeasureGuideId)) {
    return [key];
  }
  return [];
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").replace(/[-_/()]/g, "");
}

const TOP_ONLY_GUIDE_IDS = new Set<MeasureGuideId>([
  "sleeve-length",
  "shoulder",
  "width-top",
  "total-length-top",
  "arm-width",
]);

const BOTTOM_ONLY_GUIDE_IDS = new Set<MeasureGuideId>([
  "total-length-bottom",
  "waist-hip",
  "leg-width",
  "rise",
  "length-leg-width",
]);

function clothingHintIsBottom(hint?: string | null) {
  if (!hint) return false;
  const n = normalize(hint);
  return (
    n.includes("바지") ||
    n.includes("스커트") ||
    n.includes("치마") ||
    n.includes("하의") ||
    n.includes("팬츠") ||
    n.includes("슬랙스") ||
    n.includes("레깅스") ||
    n.includes("bottom") ||
    n.includes("pants") ||
    n.includes("skirt") ||
    n.includes("shorts") ||
    n.includes("반바지") ||
    n.includes("청바지")
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
    n.includes("맨투맨") ||
    n.includes("후드") ||
    n.includes("패딩") ||
    n.includes("점퍼") ||
    n.includes("가디건") ||
    n.includes("top") ||
    n.includes("jacket") ||
    n.includes("coat") ||
    n.includes("shirt") ||
    n.includes("dress")
  );
}

function clothingLooksBottom(itemName?: string | null, clothingHint?: string | null) {
  const hints = [itemName, clothingHint].filter(Boolean).join(" ");
  const n = normalize(hints);
  return (
    clothingHintIsBottom(clothingHint) ||
    clothingHintIsBottom(itemName) ||
    n.includes("바지") ||
    n.includes("스커트") ||
    n.includes("치마") ||
    n.includes("청바지") ||
    n.includes("하의") ||
    n.includes("팬츠") ||
    n.includes("슬랙스") ||
    n.includes("레깅스")
  );
}

function clothingLooksTop(itemName?: string | null, clothingHint?: string | null) {
  if (clothingLooksBottom(itemName, clothingHint)) return false;
  const hints = [itemName, clothingHint].filter(Boolean).join(" ");
  const n = normalize(hints);
  return (
    clothingHintIsTop(clothingHint) ||
    clothingHintIsTop(itemName) ||
    n.includes("상의") ||
    n.includes("원피스")
  );
}

function inferMeasureGuideId(
  itemName?: string | null,
  clothingHint?: string | null
): MeasureGuideId | null {
  const hints = [itemName, clothingHint].filter(Boolean).join(" ");
  if (!hints.trim()) return null;

  const n = normalize(hints);
  const isBottom = clothingLooksBottom(itemName, clothingHint);
  const isTop = clothingLooksTop(itemName, clothingHint);

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

  // 기장 + 밑통 복합 (전체 통/총기장보다 먼저)
  if (n.includes("기장") && n.includes("밑통")) {
    return "length-leg-width";
  }

  if (
    n.includes("전체통") ||
    n.includes("통줄임") ||
    n.includes("바지통") ||
    n.includes("스커트통") ||
    n.includes("밑통") ||
    (n.includes("통") && isBottom && !n.includes("팔통") && !n.includes("기장"))
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
    // 총기장(상의·원피스·정장 자켓) vs 기장 줄임(하의가 기본)
    return n.includes("총기장") ? "total-length-top" : "total-length-bottom";
  }

  return null;
}

function remapStoredKeyToClothing(
  stored: MeasureGuideId,
  isBottom: boolean,
  isTop: boolean
): MeasureGuideId {
  if (isBottom && TOP_ONLY_GUIDE_IDS.has(stored)) {
    return stored === "width-top" ? "waist-hip" : "total-length-bottom";
  }
  if (isTop && BOTTOM_ONLY_GUIDE_IDS.has(stored)) {
    if (stored === "waist-hip") return "width-top";
    return "total-length-top";
  }
  return stored;
}

/**
 * 수선 항목 이름으로 가이드를 고른다. 카테고리에 잘못된 키가 있어도
 * 소매·어깨·품·허리·통·밑위·기장이 서로 섞여 나오지 않게 한다.
 */
export function resolveMeasureGuideId(
  itemName?: string | null,
  options?: {
    measureGuideKey?: string | null;
    clothingHint?: string | null;
  }
): MeasureGuideId | null {
  const inferred = inferMeasureGuideId(itemName, options?.clothingHint);
  if (inferred) return inferred;

  const key = options?.measureGuideKey?.trim();
  if (key && VALID_IDS.has(key as MeasureGuideId)) {
    return remapStoredKeyToClothing(
      key as MeasureGuideId,
      clothingLooksBottom(itemName, options?.clothingHint),
      clothingLooksTop(itemName, options?.clothingHint)
    );
  }

  return null;
}
