import type { RepairPhotoMediaRow } from "./repair-photos";

function mockPhoto(args: {
  title: string;
  subtitle: string;
  bg: string;
  fg: string;
  accent: string;
}): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="${args.bg}"/>
  <rect x="90" y="70" width="620" height="660" rx="36" fill="${args.accent}" opacity="0.18"/>
  <rect x="180" y="140" width="440" height="420" rx="28" fill="${args.accent}" opacity="0.55"/>
  <text x="400" y="360" text-anchor="middle" fill="${args.fg}" font-size="42" font-family="system-ui,sans-serif" font-weight="700">${args.title}</text>
  <text x="400" y="420" text-anchor="middle" fill="${args.fg}" font-size="26" font-family="system-ui,sans-serif">${args.subtitle}</text>
</svg>`.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const MOCK_REPAIR_PARTS = [
  { name: "바지 기장 수선", price: 15000, quantity: 1, detail: "줄일 길이: 3cm" },
  { name: "허리 줄임", price: 20000, quantity: 1, detail: "줄일 길이: 2cm" },
  { name: "지퍼 교체", price: 18000, quantity: 1 },
];

const BEFORE_1 = mockPhoto({
  title: "수선 전",
  subtitle: "바지 기장 · 늘어짐",
  bg: "#FFF7ED",
  fg: "#9A3412",
  accent: "#F97316",
});
const AFTER_1 = mockPhoto({
  title: "수선 후",
  subtitle: "바지 기장 · 완료",
  bg: "#ECFDF5",
  fg: "#065F46",
  accent: "#00C896",
});
const BEFORE_2 = mockPhoto({
  title: "수선 전",
  subtitle: "허리 · 여유분",
  bg: "#FFF7ED",
  fg: "#9A3412",
  accent: "#FB923C",
});
const AFTER_2 = mockPhoto({
  title: "수선 후",
  subtitle: "허리 · 완료",
  bg: "#ECFDF5",
  fg: "#065F46",
  accent: "#34D399",
});
const BEFORE_3 = mockPhoto({
  title: "수선 전",
  subtitle: "지퍼 · 불량",
  bg: "#FFF7ED",
  fg: "#9A3412",
  accent: "#FDBA74",
});

export type RepairPhotoDemoScenarioId =
  | "inboundOnly"
  | "outboundDone"
  | "mixed"
  | "empty";

export type RepairPhotoDemoScenario = {
  id: RepairPhotoDemoScenarioId;
  title: string;
  status: string;
  statusLabel: string;
  summary: string;
  photos: RepairPhotoMediaRow[];
};

export const REPAIR_PHOTO_DEMO_SCENARIOS: RepairPhotoDemoScenario[] = [
  {
    id: "inboundOnly",
    title: "입고 직후",
    status: "INBOUND",
    statusLabel: "입고완료",
    summary: "입고 촬영만 끝난 상태. 수선 후 칸은 대기 플레이스홀더가 뜹니다.",
    photos: [
      { type: "before_photo", path: BEFORE_1, provider: "mock", sequence: 1 },
      { type: "before_photo", path: BEFORE_2, provider: "mock", sequence: 2 },
    ],
  },
  {
    id: "outboundDone",
    title: "출고 완료",
    status: "READY_TO_SHIP",
    statusLabel: "출고완료",
    summary: "전·후 사진이 모두 있어 고객이 나란히 비교합니다.",
    photos: [
      { type: "before_photo", path: BEFORE_1, provider: "mock", sequence: 1 },
      { type: "after_photo", path: AFTER_1, provider: "mock", sequence: 1 },
      { type: "before_photo", path: BEFORE_2, provider: "mock", sequence: 2 },
      { type: "after_photo", path: AFTER_2, provider: "mock", sequence: 2 },
    ],
  },
  {
    id: "mixed",
    title: "항목별 진행",
    status: "PROCESSING",
    statusLabel: "수선중",
    summary: "1번은 전후 완료, 2번은 후 대기, 3번은 전만 있는 혼합 상태입니다.",
    photos: [
      { type: "before_photo", path: BEFORE_1, provider: "mock", sequence: 1 },
      { type: "after_photo", path: AFTER_1, provider: "mock", sequence: 1 },
      { type: "before_photo", path: BEFORE_2, provider: "mock", sequence: 2 },
      { type: "before_photo", path: BEFORE_3, provider: "mock", sequence: 3 },
    ],
  },
  {
    id: "empty",
    title: "사진 없음",
    status: "PICKED_UP",
    statusLabel: "수거완료",
    summary: "media 행이 없으면 주문상세에서 이 섹션 자체를 그리지 않습니다.",
    photos: [],
  },
];
