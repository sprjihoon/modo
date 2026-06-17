"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// ─── Colors ──────────────────────────────────────────────────────────────────
const LIME = "#CDEE00";
const LIME_BG = "rgba(205,238,0,0.55)";
const BLUE = "#4A7FD4";
const RED = "#E05252";

// ─── Types ──────────────────────────────────────────────────────────────────

type ImgKey = "sweaterFront" | "sweaterSide" | "sweaterTilted" | "pantsFront";

const IMG_SRC: Record<ImgKey, string> = {
  sweaterFront: "/images/measure/sweater-front.png",
  sweaterSide: "/images/measure/sweater-side.png",
  sweaterTilted: "/images/measure/sweater-tilted.png",
  pantsFront: "/images/measure/pants-front.png",
};

interface FoldConfig {
  limePoints: string;               // polygon points on back garment (tilted)
  frontDot: { cx: number; cy: number };
}

interface MeasureConfig {
  img: ImgKey;
  lime: { x: number; y: number; w: number; h: number };
  blueDot: { cx: number; cy: number };
  smallCircle: { cx: number; cy: number };
}

interface DailyItem {
  label: string;
  desc: string;
  img: ImgKey;
  line: { x1: number; y1: number; x2: number; y2: number };
}

interface MeasureType {
  id: string;
  name: string;
  clothing: "top" | "bottom";
  foldBaseline: string;
  foldNote: string;
  measurePart: string;
  fold: FoldConfig;
  measure: MeasureConfig;
  daily: DailyItem[];
  notes: string[];
}

// ─── Data ────────────────────────────────────────────────────────────────────
// Fold illustration viewBox "0 0 250 195"
//   back garment (tilted/pants) : x=5  y=10 w=112 h=138
//   front garment               : x=80 y=18 w=112 h=138
//
// Compare measure illustration viewBox "0 0 365 225"
//   sweater img                 : x=18 y=12 w=118 h=152
//   pants img                   : x=28 y=10 w=100 h=168
//   big circle                  : cx=292 cy=115 r=68
//
// Daily illustration viewBox "0 0 290 200"
//   sweater img                 : x=70 y=12 w=118 h=152
//   pants img                   : x=80 y=8  w=100 h=170

const TYPES: MeasureType[] = [
  {
    id: "sleeve-length",
    name: "소매기장 줄임",
    clothing: "top",
    foldBaseline: "한 쪽 목선",
    foldNote: "아우터, 상의, 원피스 공통",
    measurePart: "소매기장",
    fold: {
      limePoints: "87,48 117,50 117,136 82,132",
      frontDot: { cx: 182, cy: 76 },
    },
    measure: {
      img: "sweaterSide",
      lime: { x: 116, y: 68, w: 26, h: 64 },
      blueDot: { cx: 120, cy: 72 },
      smallCircle: { cx: 127, cy: 128 },
    },
    daily: [
      {
        label: "소매 기장 측정",
        desc: "소매 재단선부터 소매 끝 점까지의 길이를 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "sweaterSide",
        line: { x1: 134, y1: 72, x2: 148, y2: 134 },
      },
      {
        label: "전체 팔통 측정",
        desc: "겨드랑이 끝 점에서부터 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "sweaterFront",
        line: { x1: 38, y1: 76, x2: 38, y2: 128 },
      },
    ],
    notes: ["어깨 길이를 줄이게 되면, 그만큼 소매 기장도 함께 줄어듭니다."],
  },
  {
    id: "total-length-top",
    name: "총 기장 줄임 (상의, 원피스)",
    clothing: "top",
    foldBaseline: "어깨선",
    foldNote: "아우터, 상의, 원피스 공통",
    measurePart: "총 기장",
    fold: {
      limePoints: "80,42 112,42 112,148 76,148",
      frontDot: { cx: 136, cy: 148 },
    },
    measure: {
      img: "sweaterFront",
      lime: { x: 66, y: 14, w: 24, h: 140 },
      blueDot: { cx: 76, cy: 22 },
      smallCircle: { cx: 76, cy: 152 },
    },
    daily: [
      {
        label: "상의 총 기장 측정",
        desc: "목선 끝에서부터 밑단 끝까지 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "sweaterFront",
        line: { x1: 128, y1: 22, x2: 128, y2: 155 },
      },
    ],
    notes: [],
  },
  {
    id: "shoulder",
    name: "어깨길이 줄임",
    clothing: "top",
    foldBaseline: "한 쪽 목선",
    foldNote: "아우터, 상의, 원피스 공통",
    measurePart: "어깨 길이",
    fold: {
      limePoints: "14,12 65,16 60,54 10,46",
      frontDot: { cx: 93, cy: 48 },
    },
    measure: {
      img: "sweaterFront",
      lime: { x: 18, y: 28, w: 60, h: 20 },
      blueDot: { cx: 76, cy: 30 },
      smallCircle: { cx: 30, cy: 50 },
    },
    daily: [
      {
        label: "어깨 길이 측정",
        desc: "한쪽 목선에서부터 소매 재단선 까지의 길이를 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "sweaterFront",
        line: { x1: 122, y1: 28, x2: 38, y2: 48 },
      },
    ],
    notes: ["어깨 길이를 줄이게 되면, 그만큼 소매 기장도 함께 줄어듭니다."],
  },
  {
    id: "width-top",
    name: "전체 품 줄임 (상의, 원피스)",
    clothing: "top",
    foldBaseline: "겨드랑이 선",
    foldNote: "아우터, 상의, 원피스 공통",
    measurePart: "전체 품",
    fold: {
      limePoints: "14,50 112,50 112,68 14,68",
      frontDot: { cx: 89, cy: 76 },
    },
    measure: {
      img: "sweaterFront",
      lime: { x: 20, y: 68, w: 116, h: 18 },
      blueDot: { cx: 26, cy: 76 },
      smallCircle: { cx: 130, cy: 78 },
    },
    daily: [
      {
        label: "전체 품 측정",
        desc: "겨드랑이 선에서부터 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "sweaterFront",
        line: { x1: 38, y1: 78, x2: 130, y2: 78 },
      },
    ],
    notes: [],
  },
  {
    id: "arm-width",
    name: "전체팔통 줄임",
    clothing: "top",
    foldBaseline: "겨드랑이 선",
    foldNote: "아우터, 상의, 원피스 공통",
    measurePart: "전체 팔통",
    fold: {
      limePoints: "5,50 44,50 42,132 5,128",
      frontDot: { cx: 89, cy: 76 },
    },
    measure: {
      img: "sweaterFront",
      lime: { x: 20, y: 68, w: 22, h: 64 },
      blueDot: { cx: 26, cy: 72 },
      smallCircle: { cx: 26, cy: 130 },
    },
    daily: [
      {
        label: "전체 팔통 측정",
        desc: "겨드랑이 끝 점에서부터 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "sweaterFront",
        line: { x1: 38, y1: 76, x2: 38, y2: 132 },
      },
    ],
    notes: [],
  },
  {
    id: "total-length-bottom",
    name: "총 기장 줄임 (바지, 스커트)",
    clothing: "bottom",
    foldBaseline: "허리 끝선",
    foldNote: "바지, 치마 공통",
    measurePart: "총 기장",
    fold: {
      limePoints: "14,10 96,10 96,30 14,30",
      frontDot: { cx: 136, cy: 22 },
    },
    measure: {
      img: "pantsFront",
      lime: { x: 28, y: 8, w: 22, h: 168 },
      blueDot: { cx: 76, cy: 14 },
      smallCircle: { cx: 38, cy: 172 },
    },
    daily: [
      {
        label: "하의 총 기장 측정",
        desc: "벨트 선에서부터 밑단 끝 까지 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "pantsFront",
        line: { x1: 128, y1: 14, x2: 128, y2: 170 },
      },
    ],
    notes: [
      "밑위 길이가 같은 바지로 비교를 하셔야 합니다.",
      "밑위가 다른 경우, 직접 입고 기장을 접어서 측정해야 정확한 측정이 가능합니다.",
    ],
  },
  {
    id: "waist-hip",
    name: "허리/힙 줄임",
    clothing: "bottom",
    foldBaseline: "허리 및 엉덩이 옆선",
    foldNote: "바지, 치마 공통",
    measurePart: "허리와 힙",
    fold: {
      limePoints: "10,28 96,28 96,50 10,50",
      frontDot: { cx: 89, cy: 52 },
    },
    measure: {
      img: "pantsFront",
      lime: { x: 28, y: 40, w: 100, h: 18 },
      blueDot: { cx: 32, cy: 50 },
      smallCircle: { cx: 124, cy: 50 },
    },
    daily: [
      {
        label: "허리/힙 측정",
        desc: "허리 및 엉덩이 옆 선에서부터 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "pantsFront",
        line: { x1: 88, y1: 52, x2: 172, y2: 52 },
      },
    ],
    notes: ["허리, 힙 일부만 줄이실 경우 줄이고 싶은 부위의 cm 입력이 필요합니다."],
  },
  {
    id: "leg-width",
    name: "전체 통 줄임 (바지, 스커트)",
    clothing: "bottom",
    foldBaseline: "밑위 선",
    foldNote: "바지, 치마 공통",
    measurePart: "전체 통",
    fold: {
      limePoints: "18,82 94,82 94,100 18,100",
      frontDot: { cx: 89, cy: 92 },
    },
    measure: {
      img: "pantsFront",
      lime: { x: 28, y: 85, w: 100, h: 18 },
      blueDot: { cx: 32, cy: 95 },
      smallCircle: { cx: 124, cy: 95 },
    },
    daily: [
      {
        label: "전체 통 측정",
        desc: "허벅지 좌우 끝점까지 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "pantsFront",
        line: { x1: 88, y1: 95, x2: 172, y2: 95 },
      },
    ],
    notes: ["허벅지, 종아리, 발목(밑동)을 다르게 줄이실 경우 부위 별 cm 입력이 필요합니다."],
  },
  {
    id: "rise",
    name: "밑위 줄임",
    clothing: "bottom",
    foldBaseline: "허리 끝선",
    foldNote: "바지, 치마 공통",
    measurePart: "밑위",
    fold: {
      limePoints: "52,10 70,10 70,95 50,95",
      frontDot: { cx: 136, cy: 22 },
    },
    measure: {
      img: "pantsFront",
      lime: { x: 72, y: 8, w: 18, h: 84 },
      blueDot: { cx: 78, cy: 14 },
      smallCircle: { cx: 78, cy: 92 },
    },
    daily: [
      {
        label: "밑위 측정",
        desc: "지퍼 벨트 선에서부터 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "pantsFront",
        line: { x1: 128, y1: 14, x2: 128, y2: 92 },
      },
    ],
    notes: [
      "밑위 길이가 같은 바지로 비교를 하셔야 합니다.",
      "밑위가 다른 경우, 직접 입고 기장을 접어서 측정해야 정확한 측정이 가능합니다.",
    ],
  },
  {
    id: "bottom-length",
    name: "하의 총 기장 줄임",
    clothing: "bottom",
    foldBaseline: "벨트 선",
    foldNote: "바지, 치마 공통",
    measurePart: "하의 총 기장",
    fold: {
      limePoints: "88,10 108,10 108,148 85,148",
      frontDot: { cx: 136, cy: 22 },
    },
    measure: {
      img: "pantsFront",
      lime: { x: 108, y: 8, w: 18, h: 168 },
      blueDot: { cx: 78, cy: 14 },
      smallCircle: { cx: 118, cy: 172 },
    },
    daily: [
      {
        label: "하의 총 기장 측정",
        desc: "벨트 선에서부터 밑단 끝 까지 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "pantsFront",
        line: { x1: 128, y1: 14, x2: 128, y2: 170 },
      },
    ],
    notes: [
      "어깨 길이를 줄이게 되면, 그만큼 소매 기장도 함께 줄어듭니다.",
      "허리, 힙 일부만 줄이실 경우 줄이고 싶은 부위의 cm 입력이 필요합니다.",
      "허벅지, 종아리, 발목(밑동)을 다르게 줄이실 경우 부위 별 cm 입력이 필요합니다.",
    ],
  },
];

// ─── SVG Illustration Components ────────────────────────────────────────────

/** Fold step illustration (compare method) */
function FoldIllustration({ type }: { type: MeasureType }) {
  const backImg = type.clothing === "top" ? IMG_SRC.sweaterTilted : IMG_SRC.pantsFront;
  const frontImg = type.clothing === "top" ? IMG_SRC.sweaterFront : IMG_SRC.pantsFront;

  // back garment: x=5 y=10 w=112 h=138  (for bottom: h=155)
  const bH = type.clothing === "top" ? 138 : 155;
  // front garment: x=80 y=18 w=112 h=138 (for bottom: h=155)
  const fH = bH;

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden">
      <svg viewBox={`0 0 250 ${bH + 57}`} className="w-full">
        {/* Back garment (수선할 의류) */}
        <image href={backImg} x={5} y={10} width={112} height={bH} style={{ mixBlendMode: "multiply" }} />
        {/* Lime overlay on the measurement area */}
        <polygon points={type.fold.limePoints} fill={LIME_BG} />

        {/* Front garment (평소 잘 맞는 의류) */}
        <image href={frontImg} x={80} y={18} width={112} height={fH} style={{ mixBlendMode: "multiply" }} />
        {/* Alignment dot on front garment */}
        <circle cx={type.fold.frontDot.cx} cy={type.fold.frontDot.cy} r={10} fill={BLUE} opacity={0.85} />
        <circle cx={type.fold.frontDot.cx} cy={type.fold.frontDot.cy} r={6} fill={RED} opacity={0.9} />
      </svg>
      <p className="text-xs text-center text-gray-500 pb-3 px-3 leading-relaxed">
        수선할 의류가 밑에 평소 잘맞는 의류가 위에 오도록<br />
        포개주셔야합니다. ({type.foldNote})
      </p>
    </div>
  );
}

/** Magnified circle content */
function MagnifierCircle({
  cx, cy, r,
}: { cx: number; cy: number; r: number }) {
  const x0 = cx - r;
  const y0 = cy - r;
  return (
    <>
      {/* Circle border */}
      <circle cx={cx} cy={cy} r={r} fill="white" stroke={LIME} strokeWidth={2.5} />
      <clipPath id="bigClip">
        <circle cx={cx} cy={cy} r={r - 2} />
      </clipPath>
      <g clipPath="url(#bigClip)">
        {/* Lime stripe background */}
        <rect x={cx - 22} y={y0} width={44} height={r * 2} fill={LIME} opacity={0.65} />
        {/* Blue line – reference garment edge */}
        <line x1={cx + 10} y1={y0 + 8} x2={cx + 10} y2={cy + r - 12} stroke={BLUE} strokeWidth={3} />
        {/* Red line – garment-to-repair edge */}
        <line x1={cx - 10} y1={y0 + 8} x2={cx - 10} y2={cy + r - 30} stroke={RED} strokeWidth={3} />
        {/* Red dashed gap indicator */}
        <line x1={cx - 10} y1={cy + r - 30} x2={cx + 10} y2={cy + r - 30} stroke={RED} strokeWidth={2}
          strokeDasharray="4 3" />
        {/* Ruler */}
        <image href="/images/measure/ruler.png" x={x0 + 4} y={cy + r - 22} width={r * 2 - 8} height={18}
          style={{ mixBlendMode: "multiply" }} />
      </g>
    </>
  );
}

/** Compare measure illustration */
function MeasureIllustration({ type }: { type: MeasureType }) {
  const { measure } = type;
  const isBottom = type.clothing === "bottom";
  const imgX = isBottom ? 28 : 18;
  const imgY = isBottom ? 10 : 12;
  const imgW = isBottom ? 100 : 118;
  const imgH = isBottom ? 168 : 152;
  const vH = isBottom ? 225 : 225;

  const bigCx = 292;
  const bigCy = 115;
  const bigR = 68;

  const { smallCircle: sc } = measure;

  // Connection cone lines from small circle to big circle
  const coneLines = [
    { x1: sc.cx + 12, y1: sc.cy - 10, x2: bigCx - bigR + 4, y2: bigCy - 28 },
    { x1: sc.cx + 12, y1: sc.cy + 10, x2: bigCx - bigR + 4, y2: bigCy + 28 },
  ];

  return (
    <svg viewBox={`0 0 365 ${vH}`} className="w-full">
      {/* Clothing image */}
      <image href={IMG_SRC[measure.img]} x={imgX} y={imgY} width={imgW} height={imgH}
        style={{ mixBlendMode: "multiply" }} />

      {/* Lime highlight stripe */}
      <rect x={measure.lime.x} y={measure.lime.y} width={measure.lime.w} height={measure.lime.h}
        fill={LIME_BG} rx={3} />

      {/* Blue outer dot */}
      <circle cx={measure.blueDot.cx} cy={measure.blueDot.cy} r={13} fill={BLUE} opacity={0.85} />
      <circle cx={measure.blueDot.cx} cy={measure.blueDot.cy} r={8} fill={RED} opacity={0.9} />

      {/* Small zoom circle */}
      <circle cx={sc.cx} cy={sc.cy} r={16} fill="none" stroke={LIME} strokeWidth={2} />

      {/* Connection cone */}
      {coneLines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={LIME} strokeWidth={1.5} />
      ))}

      {/* Big magnified circle */}
      <MagnifierCircle cx={bigCx} cy={bigCy} r={bigR} />
    </svg>
  );
}

/** Daily method – single measurement item */
function DailyIllustration({ item }: { item: DailyItem }) {
  const isBottom = item.img === "pantsFront";
  const imgX = isBottom ? 80 : 70;
  const imgY = isBottom ? 8 : 12;
  const imgW = isBottom ? 100 : 118;
  const imgH = isBottom ? 170 : 152;
  const vH = 200;

  const { line: l } = item;
  const rulerX = Math.max(l.x1, l.x2) + 12;
  const rulerY = (l.y1 + l.y2) / 2 - 9;

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden">
      <svg viewBox={`0 0 290 ${vH}`} className="w-full">
        {/* Clothing */}
        <image href={IMG_SRC[item.img]} x={imgX} y={imgY} width={imgW} height={imgH}
          style={{ mixBlendMode: "multiply" }} />
        {/* Measurement line */}
        <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={BLUE} strokeWidth={2.5} strokeLinecap="round" />
        {/* Start dot (blue) */}
        <circle cx={l.x1} cy={l.y1} r={6} fill={BLUE} />
        {/* End dot (red) */}
        <circle cx={l.x2} cy={l.y2} r={6} fill={RED} />
        {/* Ruler */}
        <image href="/images/measure/ruler.png"
          x={Math.min(rulerX, 235)} y={Math.max(rulerY, 12)} width={50} height={18}
          style={{ mixBlendMode: "multiply" }} />
      </svg>
      <p className="text-sm font-semibold text-gray-700 text-center pb-1 px-3">{item.label}</p>
      <p className="text-xs text-gray-500 text-center pb-3 px-4 leading-relaxed">{item.desc}</p>
    </div>
  );
}

// ─── Supply Item ─────────────────────────────────────────────────────────────

function SupplyItem({ src, label }: { src: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-16 h-16 flex items-center justify-center">
        <img src={src} alt={label} className="w-14 h-14 object-contain" style={{ mixBlendMode: "multiply" }} />
      </div>
      <span className="text-xs text-gray-500 font-medium">{label}</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MeasureGuideClient() {
  const [tab, setTab] = useState<"daily" | "compare">("compare");
  const [selectedId, setSelectedId] = useState(TYPES[0].id);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const current = TYPES.find((t) => t.id === selectedId)!;
  const isTop = current.clothing === "top";

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <p className="text-lg font-bold text-gray-900 leading-snug">
          정확한 수선을 위해 수선 부위의
          <br />
          단면 치수 입력이 필요 합니다.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-0">
        {(
          [
            { id: "daily", label: "일상적인 방법" },
            { id: "compare", label: "잘맞는 옷과 비교 방법" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.id
                ? "border-[#00C896] text-[#00C896]"
                : "border-transparent text-gray-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* 준비물 */}
        <section>
          <p className="text-base font-bold text-gray-800 mb-2">준비물</p>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            {tab === "compare"
              ? "단면 측정을 위해 수선할 의류와 같은 종류의 의류 중 "
              : "수선할 의류와 같은 종류의 의류 중 "}
            <span className="text-red-500 font-medium">평소 잘 맞는 의류</span>와 측정을 위한{" "}
            <span className="text-red-500 font-medium">자</span>를 준비해주세요.
          </p>
          <div className="bg-gray-50 rounded-2xl p-4 flex items-start justify-around">
            {tab === "compare" && (
              <SupplyItem
                src={isTop ? IMG_SRC.sweaterTilted : IMG_SRC.pantsFront}
                label="수선할 의류"
              />
            )}
            <SupplyItem
              src={isTop ? IMG_SRC.sweaterFront : IMG_SRC.pantsFront}
              label="평소 잘 맞는 의류"
            />
            <SupplyItem src="/images/measure/ruler.png" label="자" />
          </div>
          {tab === "compare" && (
            <div className="mt-2 flex items-start gap-2">
              <span className="text-xs text-gray-400 shrink-0 mt-0.5">ⓘ</span>
              <p className="text-xs text-gray-400 leading-relaxed">
                수선 맡길 의류와 같은 종류의 의류로 치수를 측정해야 정확한 cm를 재실 수 있습니다.
              </p>
            </div>
          )}
        </section>

        {/* 치수 재는 방법 */}
        <section>
          <p className="text-base font-bold text-gray-800 mb-1">치수 재는 방법</p>
          <p className="text-xs text-gray-400 mb-3">
            아래 수선 부위별 치수 재는 안내를 차근차근 따라서 단면 치수를 측정해주세요.
          </p>

          {/* Dropdown */}
          <div className="relative mb-4">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 bg-white"
            >
              <span>{current.name}</span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedId(t.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 last:border-0 transition-colors ${
                      selectedId === t.id
                        ? "text-[#00C896] font-semibold bg-[#00C896]/5"
                        : "text-gray-700"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Illustration content */}
          {tab === "compare" ? (
            <CompareContent type={current} />
          ) : (
            <DailyContent type={current} />
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Compare Method Content ──────────────────────────────────────────────────

function CompareContent({ type }: { type: MeasureType }) {
  return (
    <div className="space-y-5">
      {/* Step 1: Fold instruction */}
      <div className="space-y-2">
        <p className="text-sm text-gray-700 leading-relaxed">
          수선할 의류를 잘 펴서 바닥에 내려놓아준 뒤, 그림과 같이{" "}
          <span className="text-red-500 font-semibold">{type.foldBaseline} 기준</span>에 맞춰서{" "}
          <span className="text-red-500 font-semibold">평소 잘 맞는 의류</span>를 포개어 주세요.
        </p>
        <FoldIllustration type={type} />
      </div>

      {/* Step 2: Measure instruction */}
      <div className="space-y-2">
        <p className="text-sm text-gray-700 leading-relaxed">
          수선할 의류와 평소 잘 맞는 의류의{" "}
          <span className="text-red-500 font-semibold">{type.measurePart} 차이</span>를{" "}
          <span className="text-red-500 font-semibold">자</span>를 이용하여 측정한 후, 수선 서비스
          신청 단계에서 cm를 입력해주세요.
        </p>
        <div className="bg-gray-50 rounded-2xl overflow-hidden">
          <MeasureIllustration type={type} />
        </div>
      </div>

      {/* Notes */}
      {type.notes.length > 0 && (
        <ul className="space-y-1.5">
          {type.notes.map((n, i) => (
            <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600 leading-relaxed">
              <span className="shrink-0 mt-0.5">·</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Daily Method Content ────────────────────────────────────────────────────

function DailyContent({ type }: { type: MeasureType }) {
  return (
    <div className="space-y-4">
      {type.daily.map((item, i) => (
        <DailyIllustration key={i} item={item} />
      ))}
      {type.notes.length > 0 && (
        <ul className="space-y-1.5">
          {type.notes.map((n, i) => (
            <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600 leading-relaxed">
              <span className="shrink-0 mt-0.5">·</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
