"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Category {
  id: string;
  name: string;
  icon_name?: string;
  display_order?: number;
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
      // 소카테고리 없음 → 바로 다음 단계
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
        // 소카테고리 없음 → 대카테고리 그대로 진행
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
                onClick={() => onNext(cat.name, cat.id)}
                className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 border-gray-100 bg-white active:scale-95 active:border-[#00C896] transition-all"
              >
                {iconSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={iconSrc}
                    alt={cat.name}
                    className="w-20 h-20 object-contain [filter:invert(50%)_sepia(0%)_saturate(0%)_brightness(60%)]"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      t.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 flex items-center justify-center">
                    <span className="text-4xl">✂️</span>
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
