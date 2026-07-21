"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { FAQ_ITEMS } from "@/lib/faq";

export function FaqClient() {
  const [expanded, setExpanded] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="px-5 py-4 flex items-center gap-2 border-b border-gray-100 bg-white">
        <HelpCircle className="w-4 h-4 text-blue-500" />
        <p className="text-sm text-gray-500">궁금한 점을 선택해 답을 확인하세요</p>
      </div>

      <div className="divide-y divide-gray-100 bg-white">
        {FAQ_ITEMS.map((item) => {
          const open = expanded === item.id;
          return (
            <div key={item.id}>
              <button
                type="button"
                className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 active:bg-gray-50"
                onClick={() => setExpanded(open ? null : item.id)}
                aria-expanded={open}
              >
                <p className="text-sm font-semibold text-gray-900 flex-1">
                  <span className="text-[#00C896] mr-1.5">Q.</span>
                  {item.question}
                </p>
                {open ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                )}
              </button>
              {open && (
                <div className="px-5 pb-4 pt-0 bg-gray-50 border-t border-gray-100">
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap pt-3">
                    <span className="text-gray-400 font-medium mr-1.5">A.</span>
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
