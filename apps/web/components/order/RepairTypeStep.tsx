"use client";

import { useEffect, useState } from "react";
import { Plus, Minus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderDraft } from "./OrderNewClient";

interface RepairType {
  id: string;
  name: string;
  price: number;
  price_range?: string;
  category_id?: string;
}

interface RepairTypeStepProps {
  clothingType: string;
  clothingCategoryId?: string;
  onNext: (items: OrderDraft["repairItems"], imageUrls: string[]) => void;
  onBack: () => void;
}

export function RepairTypeStep({
  clothingType,
  clothingCategoryId,
  onNext,
  onBack,
}: RepairTypeStepProps) {
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedItems, setSelectedItems] = useState<
    Array<{ id: string; name: string; price: number; priceRange: string; quantity: number; detail: string }>
  >([]);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  useEffect(() => {
    loadRepairTypes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clothingType, clothingCategoryId]);

  async function loadRepairTypes() {
    try {
      setLoadError(false);

      // 서버 API 경유 (RLS 우회 + 컬럼명 보정)
      const params = new URLSearchParams();
      if (clothingCategoryId) params.set("category_id", clothingCategoryId);

      const res = await fetch(`/api/repair-types?${params.toString()}`);
      const json = await res.json();

      let items: { id: string; name: string; price?: number }[] = json.data ?? [];

      // 카테고리 필터 결과가 없으면 전체 조회
      if (items.length === 0 && clothingCategoryId) {
        const res2 = await fetch("/api/repair-types");
        const json2 = await res2.json();
        items = json2.data ?? [];
      }

      if (items.length > 0) {
        setRepairTypes(
          items.map((d) => ({
            id: d.id,
            name: d.name,
            price: d.price ?? 0,
            price_range: d.price ? `₩${d.price.toLocaleString()}` : "",
          }))
        );
      }
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleItem(type: RepairType) {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.id === type.id);
      if (exists) {
        return prev.filter((i) => i.id !== type.id);
      }
      return [
        ...prev,
        {
          id: type.id,
          name: type.name,
          price: type.price,
          priceRange: type.price_range || "",
          quantity: 1,
          detail: "",
        },
      ];
    });
  }

  function updateQuantity(id: string, delta: number) {
    setSelectedItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      )
    );
  }

  function updateDetail(id: string, detail: string) {
    setSelectedItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, detail } : i))
    );
  }

  function removeItem(id: string) {
    setSelectedItems((prev) => prev.filter((i) => i.id !== id));
  }

  const totalLabel = selectedItems.length > 0
    ? `${selectedItems.length}개 선택됨 → 다음`
    : "수선 항목을 선택해주세요";

  return (
    <div>
      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">
          수선 항목을 선택해주세요
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {clothingType} · 복수 선택 가능
        </p>
      </div>

      {/* 선택된 항목 */}
      {selectedItems.length > 0 && (
        <div className="px-4 py-3 bg-[#00C896]/5 border-b border-[#00C896]/10">
          <p className="text-xs font-bold text-[#00C896] mb-2">선택된 항목</p>
          <div className="space-y-2">
            {selectedItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-3 border border-[#00C896]/20">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3 text-gray-600" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3 text-gray-600" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-1 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {item.priceRange && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.priceRange}</p>
                )}
                <input
                  type="text"
                  placeholder="상세 요청사항 (선택)"
                  value={item.detail}
                  onChange={(e) => updateDetail(item.id, e.target.value)}
                  className="mt-2 w-full text-xs border border-gray-100 rounded-lg px-2.5 py-2 outline-none focus:border-[#00C896]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 수선 목록 */}
      <div className="px-4 py-3 space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))
        ) : loadError ? (
          <div className="text-center py-10">
            <p className="text-sm text-gray-400 mb-3">수선 항목을 불러오지 못했습니다</p>
            <button
              onClick={loadRepairTypes}
              className="text-sm text-[#00C896] font-semibold"
            >
              다시 시도
            </button>
          </div>
        ) : repairTypes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            수선 항목이 없습니다
          </p>
        ) : (
          repairTypes.map((type) => {
            const isSelected = selectedItems.some((i) => i.id === type.id);
            return (
              <button
                key={type.id}
                onClick={() => toggleItem(type)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                  isSelected
                    ? "border-[#00C896] bg-[#00C896]/5"
                    : "border-gray-100 bg-white"
                )}
              >
                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      isSelected ? "text-[#00C896]" : "text-gray-800"
                    )}
                  >
                    {type.name}
                  </p>
                  {type.price_range && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {type.price_range}
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-3",
                    isSelected
                      ? "border-[#00C896] bg-[#00C896]"
                      : "border-gray-200"
                  )}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                    >
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
        <button onClick={onBack} className="btn-outline px-5 py-4">
          이전
        </button>
        <button
          onClick={() =>
            onNext(
              selectedItems.map((i) => ({
                name: i.name,
                price: i.price,
                priceRange: i.priceRange,
                quantity: i.quantity,
                detail: i.detail,
              })),
              []
            )
          }
          disabled={selectedItems.length === 0}
          className="btn-brand flex-1 py-4"
        >
          {selectedItems.length > 0
            ? `${selectedItems.length}개 선택 → 다음`
            : "수선 항목을 선택해주세요"}
        </button>
      </div>
    </div>
  );
}
