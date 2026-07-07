/**
 * 바코드 레이아웃 타입 및 유틸리티
 * page.tsx에서 export하면 Next.js 빌드 오류가 발생하므로 별도 파일로 분리
 */

export interface BarcodeLayoutElement {
  fieldKey: string;
  label: string;
  exampleValue: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontSize: number;   // px
  isBold: boolean;
  letterSpacing: number;
  visible: boolean;
  type: "barcode" | "text";
}

export interface BarcodeLayoutConfig {
  labelWidthMm: number;
  labelHeightMm: number;
  elements: BarcodeLayoutElement[];
}

export const BARCODE_LAYOUT_KEY = "barcode-label-layout-v2";

export const DEFAULT_BARCODE_ELEMENTS: BarcodeLayoutElement[] = [
  {
    fieldKey: "barcode",
    label: "바코드 이미지",
    exampleValue: "623456789012-01",
    xMm: 1, yMm: 1, widthMm: 68, heightMm: 14,
    fontSize: 10, isBold: false, letterSpacing: 0, visible: true, type: "barcode",
  },
  {
    fieldKey: "barcode_no",
    label: "바코드 번호",
    exampleValue: "623456789012-01",
    xMm: 1, yMm: 15.5, widthMm: 68, heightMm: 3,
    fontSize: 8, isBold: false, letterSpacing: 0, visible: true, type: "text",
  },
  {
    fieldKey: "customer_name",
    label: "고객명 + 순번",
    exampleValue: "홍길동 (1/2)",
    xMm: 1, yMm: 19, widthMm: 38, heightMm: 4,
    fontSize: 9, isBold: true, letterSpacing: 0, visible: true, type: "text",
  },
  {
    fieldKey: "item_name",
    label: "수선 항목",
    exampleValue: "자켓 수선",
    xMm: 1, yMm: 23, widthMm: 44, heightMm: 3,
    fontSize: 8, isBold: false, letterSpacing: 0, visible: true, type: "text",
  },
  {
    fieldKey: "repair_part",
    label: "수선 부위",
    exampleValue: "소매기장 줄임",
    xMm: 1, yMm: 26.5, widthMm: 44, heightMm: 3,
    fontSize: 8, isBold: false, letterSpacing: 0, visible: true, type: "text",
  },
  {
    fieldKey: "date",
    label: "입고일",
    exampleValue: "입고일 2026.07.07",
    xMm: 46, yMm: 23, widthMm: 23, heightMm: 3,
    fontSize: 7, isBold: false, letterSpacing: 0, visible: true, type: "text",
  },
];

export const DEFAULT_BARCODE_CONFIG: BarcodeLayoutConfig = {
  labelWidthMm: 70,
  labelHeightMm: 30,
  elements: DEFAULT_BARCODE_ELEMENTS,
};

export function loadBarcodeLayout(): BarcodeLayoutConfig {
  if (typeof window === "undefined") return DEFAULT_BARCODE_CONFIG;
  try {
    const s = localStorage.getItem(BARCODE_LAYOUT_KEY);
    if (s) return { ...DEFAULT_BARCODE_CONFIG, ...JSON.parse(s) };
  } catch {}
  return DEFAULT_BARCODE_CONFIG;
}

export function saveBarcodeLayout(cfg: BarcodeLayoutConfig) {
  localStorage.setItem(BARCODE_LAYOUT_KEY, JSON.stringify(cfg));
}
