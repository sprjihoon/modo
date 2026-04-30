"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon_name?: string;
  is_active?: boolean;
  display_order?: number;
}

// icon_name → SVG 경로 또는 URL 반환
function getIconSrc(iconName?: string): string | null {
  if (!iconName) return null;
  // URL인 경우 그대로 사용 (관리자에서 업로드한 외부 URL)
  if (iconName.startsWith("http")) return iconName;
  // 파일명인 경우 public/icons/ 경로 사용
  const cleaned = iconName.toLowerCase().replace(/\.svg$/, "");
  return `/icons/${cleaned}.svg`;
}

// SVG가 없을 때 사용하는 fallback 이모지
function getFallbackEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("tshirt") || n.includes("티셔츠") || n.includes("맨투맨")) return "👕";
  if (n.includes("shirt") || n.includes("셔츠") || n.includes("블라우스")) return "👔";
  if (n.includes("pants") || n.includes("바지")) return "👖";
  if (n.includes("dress") || n.includes("원피스")) return "👗";
  if (n.includes("skirt") || n.includes("치마")) return "🩱";
  if (n.includes("jeans") || n.includes("청바지")) return "👖";
  if (n.includes("outer") || n.includes("아우터") || n.includes("자켓") || n.includes("코트")) return "🧥";
  if (n.includes("suit") || n.includes("정장")) return "👔";
  if (n.includes("sweater") || n.includes("니트") || n.includes("스웨터")) return "🧶";
  if (n.includes("leather") || n.includes("가죽")) return "🧥";
  return "👕";
}

interface ClothingTypeStepProps {
  onNext: (type: string, categoryId?: string) => void;
}

export function ClothingTypeStep({ onNext }: ClothingTypeStepProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("repair_categories")
        .select("id, name, icon_name, is_active, display_order")
        .eq("is_active", true)
        .is("parent_category_id", null)
        .order("display_order", { ascending: true });

      if (data && data.length > 0) {
        setCategories(data);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    } catch {
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="px-4 py-5">
      <h2 className="text-lg font-bold text-gray-900 mb-1">
        수선할 의류를 선택해주세요
      </h2>
      <p className="text-sm text-gray-400 mb-5">
        의류 종류에 맞는 수선 메뉴를 제공해드립니다
      </p>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {categories.map((cat) => {
            const iconSrc = getIconSrc(cat.icon_name);
            const isSelected = selected === cat.name;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelected(cat.name);
                  setSelectedId(cat.id);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 transition-all active:scale-95",
                  isSelected
                    ? "border-[#00C896] bg-[#00C896]/5"
                    : "border-gray-100 bg-white"
                )}
              >
                {iconSrc ? (
                  <div className="w-9 h-9 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={iconSrc}
                      alt={cat.name}
                      width={36}
                      height={36}
                      className={cn(
                        "w-9 h-9 object-contain transition-all",
                        isSelected
                          ? "[filter:invert(56%)_sepia(74%)_saturate(442%)_hue-rotate(119deg)_brightness(97%)_contrast(101%)]"
                          : "[filter:invert(50%)_sepia(0%)_saturate(0%)_brightness(60%)]"
                      )}
                      onError={(e) => {
                        // SVG 로드 실패 시 이모지로 fallback
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-3xl leading-none">${getFallbackEmoji(cat.name)}</span>`;
                        }
                      }}
                    />
                  </div>
                ) : (
                  <span className="text-3xl leading-none">
                    {getFallbackEmoji(cat.name)}
                  </span>
                )}
                <span
                  className={cn(
                    "text-xs font-semibold text-center leading-tight",
                    isSelected ? "text-[#00C896]" : "text-gray-600"
                  )}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => onNext(selected, selectedId)}
        disabled={!selected}
        className="btn-brand w-full py-4 text-base mt-6"
      >
        다음
      </button>
    </div>
  );
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: "1", name: "티셔츠/맨투맨", icon_name: "tshirt" },
  { id: "2", name: "셔츠/블라우스", icon_name: "shirt" },
  { id: "3", name: "원피스", icon_name: "dress" },
  { id: "4", name: "바지", icon_name: "pants" },
  { id: "5", name: "청바지", icon_name: "jeans" },
  { id: "6", name: "치마", icon_name: "skirt" },
  { id: "7", name: "아우터", icon_name: "outer" },
  { id: "8", name: "정장/수트", icon_name: "suit" },
];
