"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { InlineSvg } from "@/components/ui/InlineSvg";

interface Category {
  id: string;
  name: string;
  icon_name?: string;
  display_order?: number;
  price?: number | null;
  price_range?: string | null;
  requires_measurement?: boolean;
  input_count?: number;
  input_labels?: string[] | null;
  description?: string | null;
}


function getIconSrc(iconName?: string): string | null {
  if (!iconName) return null;
  if (iconName.startsWith("http")) return iconName;
  return `/icons/${iconName.toLowerCase().replace(/\.svg$/, "")}.svg`;
}


export interface SubCategorySelection {
  name: string;
  categoryId?: string;
  directPrice?: number | null;
  priceRange?: string | null;
  requiresMeasurement?: boolean;
  inputCount?: number;
  inputLabels?: string[] | null;
  description?: string | null;
}

interface SubCategoryStepProps {
  parentCategoryId?: string;
  parentCategoryName: string;
  onNext: (type: string, categoryId?: string, selection?: SubCategorySelection) => void;
  onBack: () => void;
  /** "backward" 일 때 자식 없으면 onNext 대신 onBack 호출 (뒤로가기 루프 방지) */
  direction?: "forward" | "backward";
}

export function SubCategoryStep({
  parentCategoryId,
  parentCategoryName,
  onNext,
  onBack,
  direction = "forward",
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
        .select("id, name, icon_name, display_order, price, price_range, requires_measurement, input_count, input_labels, description")
        .eq("is_active", true)
        .eq("parent_category_id", parentCategoryId)
        .order("display_order", { ascending: true });

      if (!data || data.length === 0) {
        if (direction === "backward") {
          onBack();
        } else {
          // 자식이 없으면 부모 카테고리 자체가 직접가격 항목일 수 있음 → 부모 정보 조회 후 전달
          const { data: parentData } = await supabase
            .from("repair_categories")
            .select("id, name, price, price_range, requires_measurement, input_count, input_labels, description")
            .eq("id", parentCategoryId)
            .single();

          if (parentData && parentData.price != null && parentData.price > 0) {
            const sel: SubCategorySelection = {
              name: parentData.name,
              categoryId: parentData.id,
              directPrice: parentData.price,
              priceRange: parentData.price_range,
              requiresMeasurement: parentData.requires_measurement,
              inputCount: parentData.input_count,
              inputLabels: parentData.input_labels,
              description: parentData.description,
            };
            onNext("", undefined, sel);
          } else {
            onNext("", undefined);
          }
        }
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
    const selection: SubCategorySelection = {
      name: cat.name,
      categoryId: cat.id,
      directPrice: cat.price,
      priceRange: cat.price_range,
      requiresMeasurement: cat.requires_measurement,
      inputCount: cat.input_count,
      inputLabels: cat.input_labels,
      description: cat.description,
    };
    onNext(cat.name, cat.id, selection);
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
                    />
                  )
                ) : null}
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                  {cat.name}
                </span>
                {cat.price != null && (
                  <span className="text-[10px] text-gray-400">
                    {cat.price_range || `${cat.price.toLocaleString("ko-KR")}원`}
                  </span>
                )}
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
