"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { InlineSvg } from "@/components/ui/InlineSvg";

interface Category {
  id: string;
  name: string;
  icon_name?: string;
  display_order?: number;
}

function getFallbackEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("tshirt") || n.includes("티셔츠") || n.includes("맨투맨") || n.includes("반팔")) return "👕";
  if (n.includes("shirt") || n.includes("셔츠") || n.includes("블라우스")) return "👔";
  if (n.includes("pants") || n.includes("바지") || n.includes("슬랙스") || n.includes("트라우저")) return "👖";
  if (n.includes("dress") || n.includes("원피스")) return "👗";
  if (n.includes("skirt") || n.includes("치마")) return "🩱";
  if (n.includes("jeans") || n.includes("청바지") || n.includes("데님")) return "👖";
  if (n.includes("outer") || n.includes("아우터") || n.includes("자켓") || n.includes("코트") || n.includes("점퍼")) return "🧥";
  if (n.includes("suit") || n.includes("정장") || n.includes("수트")) return "👔";
  if (n.includes("sweater") || n.includes("니트") || n.includes("스웨터") || n.includes("가디건")) return "🧶";
  if (n.includes("leather") || n.includes("가죽")) return "🥼";
  if (n.includes("shorts") || n.includes("반바지")) return "🩲";
  return "👕";
}

function getIconSrc(iconName?: string): string | null {
  if (!iconName) return null;
  if (iconName.startsWith("http")) return iconName;
  return `/icons/${iconName.toLowerCase().replace(/\.svg$/, "")}.svg`;
}


interface SubCategoryStepProps {
  parentCategoryId?: string;
  parentCategoryName: string;
  onNext: (type: string, categoryId?: string) => void;
  onBack: () => void;
}

export function SubCategoryStep({
  parentCategoryId,
  parentCategoryName,
  onNext,
  onBack,
}: SubCategoryStepProps) {
  const [children, setChildren] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentCategoryId]);

  async function load() {
    if (!parentCategoryId) {
      onNext("", undefined);
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("repair_categories")
        .select("id, name, icon_name, display_order")
        .eq("is_active", true)
        .eq("parent_category_id", parentCategoryId)
        .order("display_order", { ascending: true });

      if (!data || data.length === 0) {
        onNext("", undefined);
      } else {
        setChildren(data);
      }
    } catch {
      onNext("", undefined);
    } finally {
      setIsLoading(false);
    }
  }

  // 카테고리 항목 클릭
  function handleSelectMiddle(cat: Category) {
    // 하위 항목 여부와 관계없이 onNext로 진행
    // (세부항목은 사진 촬영 이후 SubCategoryStep 재진입 시 표시)
    onNext(cat.name, cat.id);
  }

  if (isLoading) {
    return (
      <div className="px-4 py-5">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── 카테고리 목록 뷰 ───────────────────────────────────────────────────
  return (
    <div>
      <div className="px-4 py-5">
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          수선 부위를 선택해주세요
        </h2>
        <p className="text-sm text-gray-400 mb-5">
          {parentCategoryName} · 수선 항목을 선택해주세요
        </p>
        <div className="grid grid-cols-2 gap-3">
          {children.map((cat) => {
            const iconSrc = getIconSrc(cat.icon_name);
            return (
              <button
                key={cat.id}
                onClick={() => handleSelectMiddle(cat)}
                className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 border-gray-100 bg-white active:scale-95 active:border-[#00C896] transition-all"
              >
                {iconSrc ? (
                  iconSrc.startsWith("http") ? (
                    <img
                      src={iconSrc}
                      alt={cat.name}
                      className="w-20 h-20 object-contain"
                    />
                  ) : (
                    <InlineSvg
                      src={iconSrc}
                      className="w-20 h-20 flex items-center justify-center text-gray-500 [&>svg]:w-full [&>svg]:h-full"
                      fallback={
                        <div className="w-20 h-20 flex items-center justify-center">
                          <span className="text-5xl">
                            {getFallbackEmoji(cat.name)}
                          </span>
                        </div>
                      }
                    />
                  )
                ) : (
                  <div className="w-20 h-20 flex items-center justify-center">
                    <span className="text-5xl">{getFallbackEmoji(cat.name)}</span>
                  </div>
                )}
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onBack}
          className="mt-5 w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-500 font-semibold"
        >
          이전
        </button>
      </div>

    </div>
  );
}
