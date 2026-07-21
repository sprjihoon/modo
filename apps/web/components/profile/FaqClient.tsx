"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_FAQ_ITEMS, type FaqItem } from "@/lib/faq";

export function FaqClient() {
  const [items, setItems] = useState<FaqItem[]>(DEFAULT_FAQ_ITEMS);
  const [expanded, setExpanded] = useState<string | null>(
    DEFAULT_FAQ_ITEMS[0]?.id ?? null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFaqs();
  }, []);

  async function loadFaqs() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("faqs")
        .select("id, question, answer")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped = data.map((row) => ({
          id: row.id as string,
          question: row.question as string,
          answer: row.answer as string,
        }));
        setItems(mapped);
        setExpanded((prev) =>
          prev && mapped.some((i) => i.id === prev) ? prev : mapped[0].id
        );
      }
    } catch {
      // 기본 FAQ 유지
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center bg-gray-50 min-h-screen">
        <HelpCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">등록된 질문이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="px-5 py-4 flex items-center gap-2 border-b border-gray-100 bg-white">
        <HelpCircle className="w-4 h-4 text-blue-500" />
        <p className="text-sm text-gray-500">궁금한 점을 선택해 답을 확인하세요</p>
      </div>

      <div className="divide-y divide-gray-100 bg-white">
        {items.map((item) => {
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
