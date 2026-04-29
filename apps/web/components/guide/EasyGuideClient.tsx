"use client";

import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Shirt,
  ShoppingBag,
  Footprints,
  BedDouble,
  Briefcase,
  Maximize2,
  type LucideIcon,
} from "lucide-react";

interface EasyGuideStep {
  emoji: string;
  title: string;
  desc: string;
}

interface NonRepairableItem {
  Icon: LucideIcon;
  title: string;
  desc: string;
}

const NON_REPAIRABLE_ITEMS: NonRepairableItem[] = [
  {
    Icon: Shirt,
    title: "의류",
    desc: "니트, 밍크, 특수복(등산복, 스키복, 속옷, 수영복, 한복, 의사가운, 열처리복 등)",
  },
  {
    Icon: ShoppingBag,
    title: "잡화류",
    desc: "넥타이, 머플러, 모자, 지갑 등",
  },
  {
    Icon: Footprints,
    title: "신발류",
    desc: "운동화, 구두, 천연 가죽 신발 등",
  },
  {
    Icon: BedDouble,
    title: "침구, 리빙류",
    desc: "이불, 러그, 커튼 등",
  },
  {
    Icon: Briefcase,
    title: "가방류",
    desc: "가죽 가방, 세무(스웨이드) 가방, 에코백 등",
  },
  {
    Icon: Maximize2,
    title: "늘림 수선",
    desc: "기장/길이 늘림, 전체폼 늘림, 팔통 늘림 등",
  },
];

interface EasyGuideClientProps {
  intro: string;
  steps: EasyGuideStep[];
}

function ProhibitedIcon({ Icon }: { Icon: LucideIcon }) {
  return (
    <div className="relative w-11 h-11 shrink-0">
      <div className="w-11 h-11 bg-white border border-gray-200 rounded-xl flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom right, transparent calc(50% - 1.5px), #ea580c 50%, transparent calc(50% + 1.5px))",
          borderRadius: "0.75rem",
        }}
      />
    </div>
  );
}

export function EasyGuideClient({ intro, steps }: EasyGuideClientProps) {
  const router = useRouter();

  return (
    <>
      <div className="px-4 py-6 space-y-4">
        {intro && (
          <p className="text-sm text-gray-600 leading-relaxed pb-2">{intro}</p>
        )}

        {steps.map((s, idx) => (
          <div
            key={idx}
            className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm"
          >
            <div className="w-10 h-10 bg-[#00C896]/10 rounded-full flex items-center justify-center text-xl shrink-0">
              {s.emoji}
            </div>
            <div>
              <p className="text-xs text-[#00C896] font-semibold mb-0.5">
                STEP {idx + 1}
              </p>
              <p className="text-sm font-bold text-gray-800">{s.title}</p>
              {s.desc && (
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {s.desc}
                </p>
              )}
            </div>
          </div>
        ))}

        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-gray-800">수선 불가 품목</p>
          {NON_REPAIRABLE_ITEMS.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <ProhibitedIcon Icon={item.Icon} />
              <div className="pt-1">
                <p className="text-xs font-bold text-gray-700">{item.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pb-8">
        <button
          onClick={() => router.push("/order/new")}
          className="w-full py-4 bg-[#00C896] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 active:brightness-95 transition-all"
        >
          지금 수거 신청하기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
