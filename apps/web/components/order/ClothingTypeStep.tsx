"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { InlineSvg } from "@/components/ui/InlineSvg";

interface Category {
  id: string;
  name: string;
  icon_name?: string;
  is_active?: boolean;
  display_order?: number;
}

function getIconSrc(iconName?: string): string | null {
  if (!iconName) return null;
  if (iconName.startsWith("http")) return iconName;
  const cleaned = iconName.toLowerCase().replace(/\.svg$/, "");
  return `/icons/${cleaned}.svg`;
}

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
  return "👕";
}

interface ClothingTypeStepProps {
  onNext: (type: string, categoryId?: string) => void;
}

export function ClothingTypeStep({ onNext }: ClothingTypeStepProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);

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

      setCategories(data && data.length > 0 ? data : DEFAULT_CATEGORIES);
    } catch {
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelect(cat: Category) {
    setLoadingId(cat.id);
    onNext(cat.name, cat.id);
  }

  return (
    <div>
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-lg font-bold text-gray-900">
          어떤 의류를 수선하시나요?
        </h2>
      </div>

      {isLoading ? (
        <div className="space-y-2 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {categories.map((cat) => {
            const iconSrc = getIconSrc(cat.icon_name);
            const isItemLoading = loadingId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelect(cat)}
                disabled={!!loadingId}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-4 bg-white transition-all",
                  isItemLoading ? "opacity-70" : "active:bg-gray-50"
                )}
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  {iconSrc ? (
                    iconSrc.startsWith("http") ? (
                      <img
                        src={iconSrc}
                        alt={cat.name}
                        className="w-9 h-9 object-contain"
                      />
                    ) : (
                      <InlineSvg
                        src={iconSrc}
                        className="w-9 h-9 flex items-center justify-center text-gray-500 [&>svg]:w-full [&>svg]:h-full"
                        fallback={<span className="text-2xl">{getFallbackEmoji(cat.name)}</span>}
                      />
                    )
                  ) : (
                    <span className="text-2xl">{getFallbackEmoji(cat.name)}</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-700 flex-1 text-left">
                  {cat.name}
                </span>
                {isItemLoading ? (
                  <div className="w-4 h-4 border-2 border-[#00C896] border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
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
