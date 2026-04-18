"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Scissors } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { formatPrice } from "@/lib/utils";

interface RepairType {
  id: string;
  name: string;
  price?: number;
  description?: string;
  category_id?: string;
}

interface SubCategory {
  id: string;
  name: string;
  display_order: number;
  repair_types: RepairType[];
}

interface MainCategory {
  id: string;
  name: string;
  display_order: number;
  sub_categories: SubCategory[];
  repair_types: RepairType[]; // 대카테고리 직속 항목 (있는 경우)
}

interface FlatCategory {
  id: string;
  name: string;
  display_order: number;
  repair_types: RepairType[];
}

export default function PriceGuidePage() {
  const router = useRouter();
  const [isHierarchical, setIsHierarchical] = useState(false);
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [flatCategories, setFlatCategories] = useState<FlatCategory[]>([]);
  const [uncategorized, setUncategorized] = useState<RepairType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 탭: 대카테고리 id 또는 flat 카테고리 id
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/repair-categories");
      if (res.ok) {
        const json = await res.json();
        if (json.hierarchical && (json.mainCategories?.length ?? 0) > 0) {
          setIsHierarchical(true);
          setMainCategories(json.mainCategories ?? []);
          setFlatCategories(json.data ?? []);
          setUncategorized(json.uncategorized ?? []);
          setSelectedId(json.mainCategories[0]?.id ?? null);
        } else {
          setIsHierarchical(false);
          setFlatCategories(json.data ?? []);
          setUncategorized(json.uncategorized ?? []);
          const allFlat: FlatCategory[] = json.data ?? [];
          setSelectedId(allFlat[0]?.id ?? null);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function priceLabel(r: RepairType): string {
    if (r.price != null && r.price > 0) return formatPrice(r.price);
    return "가격 문의";
  }

  // ── 탭 목록 ──
  const tabs: { id: string; name: string }[] = isHierarchical
    ? mainCategories.map((m) => ({ id: m.id, name: m.name }))
    : flatCategories.map((c) => ({ id: c.id, name: c.name }));

  if (uncategorized.length > 0) {
    tabs.push({ id: "__other__", name: "기타" });
  }

  const hasContent = mainCategories.length > 0 || flatCategories.length > 0 || uncategorized.length > 0;

  // ── 선택된 탭의 콘텐츠 ──
  function renderSelectedContent() {
    if (selectedId === "__other__") {
      return <ItemList items={uncategorized} priceLabel={priceLabel} />;
    }

    if (isHierarchical) {
      const main = mainCategories.find((m) => m.id === selectedId);
      if (!main) return null;
      return (
        <div className="space-y-5">
          {/* 대카테고리 직속 항목 */}
          {main.repair_types.length > 0 && (
            <ItemList items={main.repair_types} priceLabel={priceLabel} />
          )}
          {/* 소카테고리별 그룹 */}
          {main.sub_categories.map((sub) => (
            <div key={sub.id}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 rounded-full bg-[#00C896]/50" />
                <span className="text-sm font-semibold text-gray-600">{sub.name}</span>
              </div>
              <ItemList items={sub.repair_types} priceLabel={priceLabel} />
            </div>
          ))}
          {main.sub_categories.length === 0 && main.repair_types.length === 0 && (
            <EmptyState />
          )}
        </div>
      );
    }

    // flat
    const cat = flatCategories.find((c) => c.id === selectedId);
    if (!cat) return null;
    return cat.repair_types.length > 0 ? (
      <ItemList items={cat.repair_types} priceLabel={priceLabel} />
    ) : (
      <EmptyState />
    );
  }

  const selectedName =
    selectedId === "__other__"
      ? "기타"
      : isHierarchical
      ? mainCategories.find((m) => m.id === selectedId)?.name
      : flatCategories.find((c) => c.id === selectedId)?.name;

  return (
    <PageLayout title="가격 안내" showBack showAppBanner={false}>
      {/* 안내 배너 */}
      <div className="mx-4 mt-4 p-4 bg-[#00C896]/5 border border-[#00C896]/20 rounded-2xl">
        <p className="text-xs text-[#00C896] font-semibold">참고 안내</p>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
          실제 수선 가격은 상태에 따라 달라질 수 있습니다.
        </p>
      </div>

      {/* 카테고리 탭 */}
      {!isLoading && hasContent && tabs.length > 1 && (
        <div className="mt-4 px-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedId(tab.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  selectedId === tab.id
                    ? "bg-[#00C896] text-white shadow-sm"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 선택된 카테고리 타이틀 */}
      {!isLoading && selectedName && (
        <div className="px-4 pt-5 pb-1">
          <h2 className="text-lg font-bold text-gray-900">{selectedName}</h2>
        </div>
      )}

      {/* 콘텐츠 */}
      <div className="px-4 py-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !hasContent ? (
          <div className="py-20 text-center">
            <Scissors className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">등록된 수선 항목이 없어요</p>
            <p className="text-xs text-gray-300 mt-1">잠시 후 다시 확인해 주세요</p>
          </div>
        ) : (
          renderSelectedContent()
        )}
      </div>

      {/* CTA */}
      <div className="px-4 pb-8 mt-2">
        <button
          onClick={() => router.push("/order/new")}
          className="w-full py-4 bg-[#00C896] text-white text-sm font-bold rounded-xl active:brightness-95 transition-all"
        >
          수선 신청 바로가기
        </button>
      </div>
    </PageLayout>
  );
}

function ItemList({
  items,
  priceLabel,
}: {
  items: RepairType[];
  priceLabel: (r: RepairType) => string;
}) {
  if (items.length === 0) return <EmptyState />;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
      {items.map((r) => {
        const label = priceLabel(r);
        return (
          <div key={r.id} className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm text-gray-700 font-medium">{r.name}</p>
              {r.description && (
                <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>
              )}
            </div>
            <span
              className={`text-sm font-bold shrink-0 ml-3 ${
                r.price && r.price > 0 ? "text-[#00C896]" : "text-gray-400"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-gray-400">등록된 항목이 없어요</p>
    </div>
  );
}
