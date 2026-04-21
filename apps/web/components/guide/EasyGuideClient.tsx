"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

interface EasyGuideStep {
  emoji: string;
  title: string;
  desc: string;
}

interface EasyGuideClientProps {
  intro: string;
  steps: EasyGuideStep[];
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
