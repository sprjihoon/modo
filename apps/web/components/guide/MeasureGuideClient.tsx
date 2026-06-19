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

// Fold illustration uses CSS percentage-based positioning
interface FoldConfig {
  /** pre-made fold illustration image (takes priority when set) */
  foldImage?: string;
  /** lime overlay on back garment (% of image: left top width height) */
  lime: { left: string; top: string; width: string; height: string };
  /** alignment dot on front garment (% of image: left top) */
  dot: { left: string; top: string };
}

// Compare measure illustration uses SVG coordinates
// viewBox "0 0 365 225"
// sweater img: x=18 y=12 w=118 h=152
// pants  img: x=28 y=10 w=100 h=168
// big circle: cx=292 cy=115 r=66
interface MeasureConfig {
  /** pre-made compare illustration image (takes priority when set) */
  compareImage?: string;
  img: ImgKey;
  lime: { x: number; y: number; w: number; h: number };
  blueDot: { cx: number; cy: number };
  smallCircle: { cx: number; cy: number };
}

// Daily illustration uses SVG coordinates
// viewBox "0 0 290 200"
// sweater img: x=70 y=12 w=118 h=152
// pants  img: x=75 y=8  w=100 h=172
interface DailyItem {
  label: string;
  desc: string;
  img: ImgKey;
  line: { x1: number; y1: number; x2: number; y2: number };
  /** pre-made daily illustration image (takes priority when set) */
  dailyImage?: string;
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

const TYPES: MeasureType[] = [
  {
    id: "sleeve-length",
    name: "소매기장 줄임",
    clothing: "top",
    foldBaseline: "한 쪽 목선",
    foldNote: "아우터, 상의, 원피스 공통",
    measurePart: "소매기장",
    fold: {
      foldImage: "/images/measure/guide/sleeve-length-fold.png",
      lime: { left: "68%", top: "34%", width: "24%", height: "50%" },
      dot: { left: "87%", top: "42%" },
    },
    measure: {
      compareImage: "/images/measure/guide/sleeve-length-compare.png",
      img: "sweaterSide",
      lime: { x: 118, y: 68, w: 22, h: 58 },
      blueDot: { cx: 122, cy: 72 },
      smallCircle: { cx: 128, cy: 122 },
    },
    daily: [
      {
        label: "소매 기장 측정",
        desc: "소매 재단선부터 소매 끝 점까지의 길이를 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "sweaterSide",
        line: { x1: 178, y1: 72, x2: 190, y2: 130 },
        dailyImage: "/images/measure/guide/sleeve-length-daily.png",
      },
      {
        label: "전체 팔통 측정",
        desc: "겨드랑이 끝 점에서부터 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "sweaterFront",
        line: { x1: 78, y1: 76, x2: 78, y2: 130 },
        dailyImage: "/images/measure/guide/arm-width-daily.png",
      },
    ],
    notes: ["어깨 길이를 줄이게 되면, 그만큼 소매 기장도 함께 줄어듭니다."],
  },
  {
    id: "shoulder",
    name: "어깨길이 줄임",
    clothing: "top",
    foldBaseline: "한 쪽 목선",
    foldNote: "아우터, 상의, 원피스 공통",
    measurePart: "어깨 길이",
    fold: {
      foldImage: "/images/measure/guide/shoulder-fold.png",
      lime: { left: "10%", top: "10%", width: "42%", height: "26%" },
      dot: { left: "14%", top: "30%" },
    },
    measure: {
      compareImage: "/images/measure/guide/shoulder-compare.png",
      img: "sweaterFront",
      lime: { x: 18, y: 28, w: 58, h: 18 },
      blueDot: { cx: 74, cy: 30 },
      smallCircle: { cx: 28, cy: 48 },
    },
    daily: [
      {
        label: "어깨 길이 측정",
        desc: "한쪽 목선에서부터 소매 재단선 까지의 길이를 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "sweaterFront",
        line: { x1: 122, y1: 28, x2: 78, y2: 46 },
        dailyImage: "/images/measure/guide/shoulder-daily.png",
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
      foldImage: "/images/measure/guide/width-top-fold.png",
      lime: { left: "10%", top: "36%", width: "78%", height: "14%" },
      dot: { left: "12%", top: "43%" },
    },
    measure: {
      compareImage: "/images/measure/guide/width-top-compare.png",
      img: "sweaterFront",
      lime: { x: 18, y: 68, w: 100, h: 16 },
      blueDot: { cx: 22, cy: 76 },
      smallCircle: { cx: 128, cy: 76 },
    },
    daily: [
      {
        label: "전체 품 측정",
        desc: "겨드랑이 선에서부터 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "sweaterFront",
        line: { x1: 78, y1: 76, x2: 180, y2: 76 },
        dailyImage: "/images/measure/guide/width-top-daily.png",
      },
    ],
    notes: [],
  },
  {
    id: "total-length-top",
    name: "총 기장 줄임 (상의, 원피스)",
    clothing: "top",
    foldBaseline: "어깨선",
    foldNote: "아우터, 상의, 원피스 공통",
    measurePart: "총 기장",
    fold: {
      foldImage: "/images/measure/guide/total-length-top-fold.png",
      lime: { left: "68%", top: "28%", width: "20%", height: "60%" },
      dot: { left: "50%", top: "87%" },
    },
    measure: {
      compareImage: "/images/measure/guide/total-length-top-compare.png",
      img: "sweaterFront",
      lime: { x: 62, y: 14, w: 22, h: 140 },
      blueDot: { cx: 74, cy: 22 },
      smallCircle: { cx: 74, cy: 152 },
    },
    daily: [
      {
        label: "상의 총 기장 측정",
        desc: "목선 끝에서부터 밑단 끝까지 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "sweaterFront",
        line: { x1: 129, y1: 22, x2: 129, y2: 155 },
        dailyImage: "/images/measure/guide/total-length-top-daily.png",
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
      foldImage: "/images/measure/guide/arm-width-fold.png",
      lime: { left: "8%", top: "36%", width: "20%", height: "45%" },
      dot: { left: "12%", top: "43%" },
    },
    measure: {
      compareImage: "/images/measure/guide/arm-width-compare.png",
      img: "sweaterFront",
      lime: { x: 18, y: 68, w: 18, h: 58 },
      blueDot: { cx: 22, cy: 72 },
      smallCircle: { cx: 24, cy: 124 },
    },
    daily: [],
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
      foldImage: "/images/measure/guide/total-length-bottom-fold.png",
      lime: { left: "10%", top: "4%", width: "78%", height: "14%" },
      dot: { left: "50%", top: "10%" },
    },
    measure: {
      compareImage: "/images/measure/guide/total-length-bottom-compare.png",
      img: "pantsFront",
      lime: { x: 28, y: 10, w: 20, h: 160 },
      blueDot: { cx: 78, cy: 16 },
      smallCircle: { cx: 36, cy: 172 },
    },
    daily: [],
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
      foldImage: "/images/measure/guide/waist-hip-fold.png",
      lime: { left: "8%", top: "18%", width: "82%", height: "14%" },
      dot: { left: "12%", top: "26%" },
    },
    measure: {
      compareImage: "/images/measure/guide/waist-hip-compare.png",
      img: "pantsFront",
      lime: { x: 28, y: 44, w: 100, h: 16 },
      blueDot: { cx: 32, cy: 52 },
      smallCircle: { cx: 126, cy: 52 },
    },
    daily: [
      {
        label: "허리/힙 측정",
        desc: "허리 및 엉덩이 옆 선에서부터 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "pantsFront",
        line: { x1: 88, y1: 52, x2: 175, y2: 52 },
        dailyImage: "/images/measure/guide/waist-hip-daily.png",
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
      lime: { left: "12%", top: "48%", width: "74%", height: "14%" },
      dot: { left: "12%", top: "55%" },
    },
    measure: {
      img: "pantsFront",
      lime: { x: 28, y: 88, w: 100, h: 16 },
      blueDot: { cx: 32, cy: 96 },
      smallCircle: { cx: 126, cy: 96 },
    },
    daily: [
      {
        label: "전체 통 측정",
        desc: "허벅지 좌우 끝점까지 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "pantsFront",
        line: { x1: 88, y1: 96, x2: 175, y2: 96 },
        dailyImage: "/images/measure/guide/leg-width-daily.png",
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
      lime: { left: "42%", top: "4%", width: "16%", height: "48%" },
      dot: { left: "50%", top: "10%" },
    },
    measure: {
      img: "pantsFront",
      lime: { x: 70, y: 10, w: 18, h: 80 },
      blueDot: { cx: 78, cy: 16 },
      smallCircle: { cx: 78, cy: 90 },
    },
    daily: [
      {
        label: "밑위 측정",
        desc: "지퍼 벨트 선에서부터 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "pantsFront",
        line: { x1: 125, y1: 14, x2: 125, y2: 96 },
        dailyImage: "/images/measure/guide/rise-daily.png",
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
      lime: { left: "75%", top: "4%", width: "16%", height: "90%" },
      dot: { left: "50%", top: "10%" },
    },
    measure: {
      img: "pantsFront",
      lime: { x: 108, y: 10, w: 18, h: 160 },
      blueDot: { cx: 78, cy: 16 },
      smallCircle: { cx: 116, cy: 172 },
    },
    daily: [
      {
        label: "하의 총 기장 측정",
        desc: "벨트 선에서부터 밑단 끝 까지 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.",
        img: "pantsFront",
        line: { x1: 125, y1: 14, x2: 125, y2: 172 },
        dailyImage: "/images/measure/guide/bottom-length-daily.png",
      },
    ],
    notes: [
      "어깨 길이를 줄이게 되면, 그만큼 소매 기장도 함께 줄어듭니다.",
      "허리, 힙 일부만 줄이실 경우 줄이고 싶은 부위의 cm 입력이 필요합니다.",
      "허벅지, 종아리, 발목(밑동)을 다르게 줄이실 경우 부위 별 cm 입력이 필요합니다.",
    ],
  },
];

// ─── Fold Illustration (HTML/CSS) ────────────────────────────────────────────

function FoldIllustration({ type }: { type: MeasureType }) {
  const backImg = type.clothing === "top" ? IMG_SRC.sweaterTilted : IMG_SRC.pantsFront;
  const frontImg = type.clothing === "top" ? IMG_SRC.sweaterFront : IMG_SRC.pantsFront;

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden">
      {type.fold.foldImage ? (
        /* pre-made illustration image */
        <img src={type.fold.foldImage} alt="접기 방법" className="w-4/5 mx-auto block" />
      ) : (
        /* fallback: two images side by side */
        <div className="flex items-center justify-center gap-3 px-4 pt-4 pb-2">
          <div className="w-[42%]">
            <img src={backImg} alt="수선할 의류" className="w-full" />
          </div>
          <span className="text-gray-400 text-lg shrink-0">▶</span>
          <div className="relative w-[42%]">
            <img src={frontImg} alt="평소 잘 맞는 의류" className="w-full" />
            <div
              className="absolute pointer-events-none"
              style={{
                left: type.fold.dot.left,
                top: type.fold.dot.top,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: BLUE }}
              >
                <div className="w-3 h-3 rounded-full" style={{ background: RED }} />
              </div>
            </div>
          </div>
        </div>
      )}
      <p className="text-xs text-center text-gray-500 py-3 px-3 leading-relaxed">
        수선할 의류가 밑에 평소 잘맞는 의류가 위에 오도록
        <br />
        포개주셔야합니다. ({type.foldNote})
      </p>
    </div>
  );
}

// ─── Magnifier Circle (SVG) ──────────────────────────────────────────────────

function MagnifierCircle({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const clipId = `clip-${cx}-${cy}`;
  const x0 = cx - r;
  const y0 = cy - r;
  return (
    <>
      <clipPath id={clipId}>
        <circle cx={cx} cy={cy} r={r - 2} />
      </clipPath>
      <circle cx={cx} cy={cy} r={r} fill="white" stroke={LIME} strokeWidth={2.5} />
      <g clipPath={`url(#${clipId})`}>
        {/* lime stripe */}
        <rect x={cx - 20} y={y0} width={40} height={r * 2} fill={LIME} opacity={0.65} />
        {/* blue line (reference garment edge) */}
        <line x1={cx + 8} y1={y0 + 8} x2={cx + 8} y2={cy + r - 14} stroke={BLUE} strokeWidth={3} />
        {/* red line (garment-to-repair edge) */}
        <line x1={cx - 8} y1={y0 + 8} x2={cx - 8} y2={cy + r - 30} stroke={RED} strokeWidth={3} />
        {/* dashed gap indicator */}
        <line
          x1={cx - 8} y1={cy + r - 30} x2={cx + 8} y2={cy + r - 30}
          stroke={RED} strokeWidth={2} strokeDasharray="4 3"
        />
        {/* ruler */}
        <image
          href="/images/measure/ruler.png"
          x={x0 + 4} y={cy + r - 20} width={r * 2 - 8} height={16}
        />
      </g>
    </>
  );
}

// ─── Compare Measure Illustration (SVG) ─────────────────────────────────────

function MeasureIllustration({ type }: { type: MeasureType }) {
  const { measure } = type;

  if (measure.compareImage) {
    return <img src={measure.compareImage} alt="측정 방법" className="w-4/5 mx-auto block" />;
  }

  const isBottom = type.clothing === "bottom";
  const imgX = isBottom ? 28 : 18;
  const imgY = isBottom ? 10 : 12;
  const imgW = isBottom ? 100 : 118;
  const imgH = isBottom ? 168 : 152;

  const bigCx = 292;
  const bigCy = 115;
  const bigR = 66;

  const sc = measure.smallCircle;

  return (
    <svg viewBox="0 0 365 225" className="w-full">
      {/* clothing image */}
      <image href={IMG_SRC[measure.img]} x={imgX} y={imgY} width={imgW} height={imgH} />

      {/* lime highlight stripe */}
      <rect
        x={measure.lime.x} y={measure.lime.y}
        width={measure.lime.w} height={measure.lime.h}
        fill={LIME_BG} rx={2}
      />

      {/* blue outer dot + red inner dot */}
      <circle cx={measure.blueDot.cx} cy={measure.blueDot.cy} r={13} fill={BLUE} opacity={0.88} />
      <circle cx={measure.blueDot.cx} cy={measure.blueDot.cy} r={7} fill={RED} opacity={0.95} />

      {/* small zoom circle */}
      <circle cx={sc.cx} cy={sc.cy} r={16} fill="none" stroke={LIME} strokeWidth={2} />

      {/* connection cone lines */}
      <line x1={sc.cx + 12} y1={sc.cy - 8} x2={bigCx - bigR + 2} y2={bigCy - 30}
        stroke={LIME} strokeWidth={1.5} />
      <line x1={sc.cx + 12} y1={sc.cy + 8} x2={bigCx - bigR + 2} y2={bigCy + 30}
        stroke={LIME} strokeWidth={1.5} />

      {/* magnified circle */}
      <MagnifierCircle cx={bigCx} cy={bigCy} r={bigR} />
    </svg>
  );
}

// ─── Daily Illustration (SVG) ────────────────────────────────────────────────

function DailyIllustration({ item }: { item: DailyItem }) {
  const isBottom = item.img === "pantsFront";
  const imgX = isBottom ? 75 : 70;
  const imgY = isBottom ? 8 : 12;
  const imgW = isBottom ? 100 : 118;
  const imgH = isBottom ? 172 : 152;

  const { line: l } = item;
  const rulerX = Math.min(Math.max(l.x1, l.x2) + 10, 238);
  const rulerY = (l.y1 + l.y2) / 2 - 8;

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden">
      {item.dailyImage ? (
        <img src={item.dailyImage} alt={item.label} className="w-4/5 mx-auto block" />
      ) : (
        <svg viewBox="0 0 290 200" className="w-full">
          <image href={IMG_SRC[item.img]} x={imgX} y={imgY} width={imgW} height={imgH} />
          <line
            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={BLUE} strokeWidth={2.5} strokeLinecap="round"
          />
          <circle cx={l.x1} cy={l.y1} r={6} fill={BLUE} />
          <circle cx={l.x2} cy={l.y2} r={6} fill={RED} />
          <image
            href="/images/measure/ruler.png"
            x={rulerX} y={Math.max(rulerY, 10)} width={46} height={16}
          />
        </svg>
      )}
      <p className="text-sm font-semibold text-gray-700 text-center pb-1 px-3">{item.label}</p>
      <p className="text-xs text-gray-500 text-center pb-3 px-4 leading-relaxed">{item.desc}</p>
    </div>
  );
}

// ─── Supply Item ─────────────────────────────────────────────────────────────

function SupplyItem({ src, label }: { src: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-20 h-20 flex items-center justify-center bg-white rounded-xl p-1">
        <img src={src} alt={label} className="max-w-full max-h-full object-contain" />
      </div>
      <span className="text-xs text-gray-500 font-medium text-center">{label}</span>
    </div>
  );
}

// ─── Compare Method Content ──────────────────────────────────────────────────

function CompareContent({ type }: { type: MeasureType }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm text-gray-700 leading-relaxed">
          수선할 의류를 잘 펴서 바닥에 내려놓아준 뒤, 그림과 같이{" "}
          <span className="text-red-500 font-semibold">{type.foldBaseline} 기준</span>에 맞춰서{" "}
          <span className="text-red-500 font-semibold">평소 잘 맞는 의류</span>를 포개어 주세요.
        </p>
        <FoldIllustration type={type} />
      </div>

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

function DailyContent() {
  const allNotes = Array.from(
    new Set(TYPES.flatMap((t) => t.notes))
  );
  return (
    <div className="space-y-6">
      {TYPES.flatMap((type) =>
        type.daily.map((item, i) => (
          <DailyIllustration key={`${type.id}-${i}`} item={item} />
        ))
      )}
      {allNotes.length > 0 && (
        <ul className="space-y-1.5">
          {allNotes.map((n, i) => (
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
      <div className="flex border-b border-gray-200">
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

          {/* Dropdown (compare 탭에서만 표시) */}
          {tab === "compare" && (
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
          )}

          {tab === "compare" ? (
            <CompareContent type={current} />
          ) : (
            <DailyContent />
          )}
        </section>
      </div>
    </div>
  );
}
