"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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
  if (n.includes("leather") || n.includes("가죽")) return "🧥";
  return "👕";
}

interface ClothingTypeStepProps {
  onNext: (type: string, categoryId?: string) => void;
}

export function ClothingTypeStep({ onNext }: ClothingTypeStepProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // 소카테고리 단계
  const [subLevel, setSubLevel] = useState<{
    parent: Category;
    children: Category[];
  } | null>(null);

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

  async function handleSelectCategory(cat: Category) {
    setLoadingId(cat.id);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("repair_categories")
        .select("id, name, icon_name, is_active, display_order")
        .eq("is_active", true)
        .eq("parent_category_id", cat.id)
        .order("display_order", { ascending: true });

      if (data && data.length > 0) {
        setSubLevel({ parent: cat, children: data });
      } else {
        onNext(cat.name, cat.id);
      }
    } catch {
      onNext(cat.name, cat.id);
    } finally {
      setLoadingId(null);
    }
  }

  // ── 소카테고리 선택 (2열 큰 카드 그리드) ──────────────────────────────
  if (subLevel) {
    return (
      <div>
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => setSubLevel(null)}
            className="flex items-center gap-1 text-sm text-gray-500 active:opacity-60"
          >
            <ChevronLeft className="w-4 h-4" />
            {subLevel.parent.name}
          </button>
        </div>
        <div className="px-4 py-5">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            수선 부위를 선택해주세요
          </h2>
          <p className="text-sm text-gray-400 mb-5">
            {subLevel.parent.name} · 수선 항목을 선택해주세요
          </p>
          <div className="grid grid-cols-2 gap-3">
            {subLevel.children.map((cat) => {
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
                        const p = t.parentElement;
                        if (p) p.innerHTML = `<span class="text-4xl">${getFallbackEmoji(cat.name)}</span>`;
                      }}
                    />
                  ) : (
                    <span className="text-4xl">{getFallbackEmoji(cat.name)}</span>
                  )}
                  <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── 대카테고리 선택 (리스트 형태) ──────────────────────────────────────
  return (
    <div>
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-lg font-bold text-gray-900">
          어떤 의류를 수선하시나요?
        </h2>
      </div>

      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 mx-4 rounded-xl animate-pulse mb-2" />
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
                onClick={() => handleSelectCategory(cat)}
                disabled={!!loadingId}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-4 bg-white transition-all",
                  isItemLoading ? "opacity-70" : "active:bg-gray-50"
                )}
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  {iconSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={iconSrc}
                      alt={cat.name}
                      className="w-9 h-9 object-contain [filter:invert(50%)_sepia(0%)_saturate(0%)_brightness(60%)]"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        t.style.display = "none";
                        const p = t.parentElement;
                        if (p) p.innerHTML = `<span class="text-2xl">${getFallbackEmoji(cat.name)}</span>`;
                      }}
                    />
                  ) : (
                    <span className="text-2xl">{getFallbackEmoji(cat.name)}</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-700 flex-1 text-left">
                  {cat.name}
                </span>
                {isItemLoading ? (
                  <div className="w-4 h-4 border-2 border-[#00C896] border-t-transparent rounded-full animate-spin" />
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
