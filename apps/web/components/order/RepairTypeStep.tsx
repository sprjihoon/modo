"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Scissors, X, Minus, Plus, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { RepairItem } from "./OrderNewClient";
import { InlineSvg } from "@/components/ui/InlineSvg";

interface RepairType {
  id: string;
  name: string;
  sub_type?: string;
  price: number;
  price_range?: string;
  description?: string;
  icon_name?: string;
  category_id?: string;
  requires_measurement: boolean;
  has_sub_parts: boolean;
  allow_multiple_sub_parts: boolean;
  sub_parts_title?: string;
  requires_multiple_inputs: boolean;
  // DB에서 string 또는 string[] 모두 가능
  input_labels?: string | string[];
  input_count?: number;
}

interface SubPart {
  id: string;
  name: string;
  price: number;
  icon_name?: string;
}

interface SelectedItem {
  id: string;
  name: string;
  price: number;
  priceRange: string;
  quantity: number;
  detail: string;
}

interface RepairTypeStepProps {
  clothingType: string;
  clothingCategoryId?: string;
  onNext: (items: RepairItem[]) => void;
  onBack: () => void;
}

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

function getRepairTypeEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("허리") || n.includes("웨이스트")) return "📐";
  if (n.includes("밑단") || n.includes("단") || n.includes("기장")) return "📏";
  if (n.includes("소매") || n.includes("팔")) return "💪";
  if (n.includes("어깨")) return "🧍";
  if (n.includes("품") || n.includes("옆선") || n.includes("사이즈")) return "📏";
  if (n.includes("지퍼") || n.includes("zip")) return "🔗";
  if (n.includes("단추") || n.includes("버튼")) return "🔘";
  if (n.includes("주머니") || n.includes("포켓")) return "🪡";
  if (n.includes("안감") || n.includes("라이닝")) return "🧵";
  if (n.includes("수선") || n.includes("수리") || n.includes("보수")) return "🪡";
  if (n.includes("패치") || n.includes("덧댐")) return "🧵";
  if (n.includes("줄임") || n.includes("늘임") || n.includes("조절")) return "📐";
  return "✂️";
}

function getIconSrc(iconName?: string): string | null {
  if (!iconName) return null;
  if (iconName.startsWith("http")) return iconName;
  return `/icons/${iconName.toLowerCase().replace(/\.svg$/, "")}.svg`;
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
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [subPartsLoading, setSubPartsLoading] = useState(false);

  // 세부 부위 인라인 뷰 상태 (모달 대신 화면 전환)
  const [subPartsView, setSubPartsView] = useState<{
    repairType: RepairType;
    subParts: SubPart[];
    selectedMode: "all" | "specific";
    selectedIds: Set<string>;
  } | null>(null);

  // 치수 입력 모달 상태 (유지)
  const [measureModal, setMeasureModal] = useState<{
    repairType: RepairType;
    values: string[];
    chosenParts?: SubPart[];
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRepairTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clothingType, clothingCategoryId]);

  async function loadRepairTypes() {
    try {
      setIsLoading(true);
      setLoadError(false);

      const params = new URLSearchParams();
      if (clothingCategoryId) params.set("category_id", clothingCategoryId);

      const res = await fetch(`/api/repair-types?${params.toString()}`);
      const json = await res.json();

      let items: RepairType[] = json.data ?? [];

      if (items.length === 0 && clothingCategoryId) {
        const res2 = await fetch("/api/repair-types");
        const json2 = await res2.json();
        items = json2.data ?? [];
      }

      setRepairTypes(
        items.map((d) => ({
          id: d.id,
          name: d.name,
          sub_type: d.sub_type ?? undefined,
          price: d.price ?? 0,
          price_range: d.price_range ?? (d.price ? formatPrice(d.price) : ""),
          description: d.description ?? undefined,
          icon_name: d.icon_name ?? undefined,
          category_id: d.category_id,
          requires_measurement: d.requires_measurement ?? false,
          has_sub_parts: d.has_sub_parts ?? false,
          allow_multiple_sub_parts: d.allow_multiple_sub_parts ?? true,
          sub_parts_title: d.sub_parts_title ?? undefined,
          requires_multiple_inputs: d.requires_multiple_inputs ?? false,
          input_labels: d.input_labels ?? "치수 (cm)",
          input_count: d.input_count ?? 1,
        }))
      );
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  // input_labels를 string[] 로 정규화
  function getInputLabels(type: RepairType): string[] {
    const count = type.input_count ?? 1;
    if (Array.isArray(type.input_labels)) return type.input_labels;
    if (typeof type.input_labels === "string" && type.input_labels) {
      if (count <= 1) return [type.input_labels];
      const parts = type.input_labels.split(/(?<=\))\s+(?=\S)/);
      if (parts.length >= count) return parts.slice(0, count);
      return Array.from({ length: count }, (_, i) => `치수 ${i + 1} (cm)`);
    }
    return Array.from({ length: count }, () => "치수 (cm)");
  }

  // 항목 탭 → 분기 처리
  async function handleTapRepairType(type: RepairType) {
    // 이미 선택된 경우 → 선택 해제
    if (selectedItems.some((i) => i.id === type.id || i.id.startsWith(`${type.id}_`))) {
      setSelectedItems((prev) =>
        prev.filter((i) => i.id !== type.id && !i.id.startsWith(`${type.id}_`))
      );
      return;
    }

    if (type.has_sub_parts) {
      await openSubPartsView(type);
    } else if (type.requires_measurement) {
      const labels = getInputLabels(type);
      setMeasureModal({ repairType: type, values: labels.map(() => "") });
    } else {
      addSimpleItem(type);
    }
  }

  function addSimpleItem(type: RepairType, detail?: string) {
    setSelectedItems((prev) => [
      ...prev,
      {
        id: type.id,
        name: type.sub_type ? `${type.name} (${type.sub_type})` : type.name,
        price: type.price,
        priceRange: type.price_range || formatPrice(type.price),
        quantity: 1,
        detail: detail ?? "",
      },
    ]);
  }

  async function openSubPartsView(type: RepairType) {
    setSubPartsLoading(true);
    try {
      const res = await fetch(`/api/repair-sub-parts?repair_type_id=${type.id}`);
      const json = await res.json();
      const subParts: SubPart[] = json.data ?? [];

      if (subParts.length === 0) {
        // 세부항목 없으면 기존 분기로
        if (type.requires_measurement) {
          const labels = getInputLabels(type);
          setMeasureModal({ repairType: type, values: labels.map(() => "") });
        } else {
          addSimpleItem(type);
        }
        return;
      }

      setSubPartsView({
        repairType: type,
        subParts,
        selectedMode: "all",
        selectedIds: new Set(),
      });
    } catch {
      addSimpleItem(type);
    } finally {
      setSubPartsLoading(false);
    }
  }

  function toggleSubPartInView(subPartId: string) {
    if (!subPartsView) return;
    const { allow_multiple_sub_parts } = subPartsView.repairType;

    setSubPartsView((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.selectedIds);
      if (allow_multiple_sub_parts) {
        next.has(subPartId) ? next.delete(subPartId) : next.add(subPartId);
      } else {
        next.clear();
        next.add(subPartId);
      }
      return { ...prev, selectedIds: next };
    });
  }

  // 인라인 세부 부위 뷰 "확인" 처리
  function confirmInlineSubParts() {
    if (!subPartsView) return;
    const { repairType, subParts, selectedMode, selectedIds } = subPartsView;

    setSubPartsView(null);

    if (selectedMode === "all") {
      // 전체 선택 → 세부 부위 없이 진행
      if (repairType.requires_measurement) {
        const labels = getInputLabels(repairType);
        setMeasureModal({ repairType, values: labels.map(() => ""), chosenParts: [] });
      } else {
        addSimpleItem(repairType);
      }
      return;
    }

    // 특정 부위 선택
    const chosenParts = subParts.filter((p) => selectedIds.has(p.id));
    if (chosenParts.length === 0) return;

    if (repairType.requires_measurement) {
      const labels = getInputLabels(repairType);
      const totalFields = labels.length * chosenParts.length;
      setMeasureModal({
        repairType,
        values: Array.from({ length: totalFields }, () => ""),
        chosenParts,
      });
      return;
    }

    const newItems: SelectedItem[] = chosenParts.map((part) => ({
      id: `${repairType.id}_${part.id}`,
      name: `${repairType.name} - ${part.name}`,
      price: part.price > 0 ? part.price : repairType.price,
      priceRange: formatPrice(part.price > 0 ? part.price : repairType.price),
      quantity: 1,
      detail: "",
    }));
    setSelectedItems((prev) => [...prev, ...newItems]);
  }

  function confirmMeasurement() {
    if (!measureModal) return;
    const { repairType, values, chosenParts } = measureModal;
    const labels = getInputLabels(repairType);

    // 세부 부위 없이 전체 모드였던 경우 (chosenParts = [] 또는 undefined)
    if (!chosenParts || chosenParts.length === 0) {
      const detail = labels
        .map((label, i) => `${label}: ${values[i] || "-"}`)
        .join(", ");
      addSimpleItem(repairType, detail);
      setMeasureModal(null);
      return;
    }

    const newItems: SelectedItem[] = chosenParts.map((part, partIdx) => {
      const detail = labels
        .map((label, i) => {
          const v = values[partIdx * labels.length + i];
          return `${label}: ${v || "-"}`;
        })
        .join(", ");
      return {
        id: `${repairType.id}_${part.id}`,
        name: `${repairType.name} - ${part.name}`,
        price: part.price > 0 ? part.price : repairType.price,
        priceRange: formatPrice(part.price > 0 ? part.price : repairType.price),
        quantity: 1,
        detail,
      };
    });
    setSelectedItems((prev) => [...prev, ...newItems]);
    setMeasureModal(null);
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

  function isRepairTypeActive(type: RepairType) {
    return selectedItems.some(
      (i) => i.id === type.id || i.id.startsWith(`${type.id}_`)
    );
  }

  // ── 세부 부위 인라인 뷰 ─────────────────────────────────────────────────
  if (subPartsView) {
    const { repairType, subParts, selectedMode, selectedIds } = subPartsView;
    const rtIconSrc = getIconSrc(repairType.icon_name);
    const selectionLabel =
      repairType.sub_parts_title || "세부 부위를 선택해주세요";
    const canConfirm =
      selectedMode === "all" || (selectedMode === "specific" && selectedIds.size > 0);

    return (
      <div className="flex flex-col min-h-0">
        {/* 헤더 */}
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            상세 수선 부위를 선택해주세요.
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* 선택된 수선 항목 카드 */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              {rtIconSrc ? (
                <InlineSvg
                  src={rtIconSrc}
                  className="w-10 h-10 flex items-center justify-center text-gray-500 [&>svg]:w-full [&>svg]:h-full"
                  fallback={
                    <span className="text-3xl">
                      {getRepairTypeEmoji(repairType.name)}
                    </span>
                  }
                />
              ) : (
                <span className="text-3xl">
                  {getRepairTypeEmoji(repairType.name)}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-gray-800">
              {repairType.sub_type
                ? `${repairType.name} (${repairType.sub_type})`
                : repairType.name}
            </span>
          </div>

          {/* 전체 / 특정 부위 선택 라디오 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">
              세부 부위를 선택(해주)세요
            </p>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setSubPartsView((prev) =>
                    prev ? { ...prev, selectedMode: "all", selectedIds: new Set() } : prev
                  )
                }
                className={cn(
                  "flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                  selectedMode === "all"
                    ? "border-[#00C896] bg-[#00C896]/5 text-[#00C896]"
                    : "border-gray-200 text-gray-600"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    selectedMode === "all"
                      ? "border-[#00C896]"
                      : "border-gray-400"
                  )}
                >
                  {selectedMode === "all" && (
                    <div className="w-2 h-2 rounded-full bg-[#00C896]" />
                  )}
                </div>
                전체
              </button>
              <button
                onClick={() =>
                  setSubPartsView((prev) =>
                    prev ? { ...prev, selectedMode: "specific" } : prev
                  )
                }
                className={cn(
                  "flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                  selectedMode === "specific"
                    ? "border-[#00C896] bg-[#00C896]/5 text-[#00C896]"
                    : "border-gray-200 text-gray-600"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    selectedMode === "specific"
                      ? "border-[#00C896]"
                      : "border-gray-400"
                  )}
                >
                  {selectedMode === "specific" && (
                    <div className="w-2 h-2 rounded-full bg-[#00C896]" />
                  )}
                </div>
                특정 부위 선택
              </button>
            </div>
          </div>

          {/* 세부 부위 카드 그리드 (특정 부위 선택 시) */}
          {selectedMode === "specific" && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                {selectionLabel}
                {repairType.allow_multiple_sub_parts ? " (다중 선택 가능)" : ""}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {subParts.map((part) => {
                  const isSelected = selectedIds.has(part.id);
                  const partIconSrc = getIconSrc(part.icon_name);
                  return (
                    <button
                      key={part.id}
                      onClick={() => toggleSubPartInView(part.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                        isSelected
                          ? "border-[#00C896] bg-[#00C896]/5"
                          : "border-gray-100 bg-gray-50"
                      )}
                    >
                      <div
                        className={cn(
                          "w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden",
                          isSelected ? "bg-[#00C896]" : "bg-[#00C896]/10"
                        )}
                      >
                        {isSelected ? (
                          <svg
                            className="w-8 h-8 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M5 13l4 4L19 7"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : partIconSrc ? (
                          <InlineSvg
                            src={partIconSrc}
                            className="w-10 h-10 flex items-center justify-center text-[#00C896] [&>svg]:w-full [&>svg]:h-full"
                            fallback={
                              <span className="text-3xl">
                                {getRepairTypeEmoji(part.name)}
                              </span>
                            }
                          />
                        ) : (
                          <span className="text-3xl">
                            {getRepairTypeEmoji(part.name)}
                          </span>
                        )}
                      </div>
                      <p
                        className={cn(
                          "text-xs font-semibold text-center leading-tight",
                          isSelected ? "text-[#00C896]" : "text-gray-700"
                        )}
                      >
                        {part.name}
                      </p>
                      {part.price > 0 && (
                        <p className="text-[10px] text-gray-400">
                          {formatPrice(part.price)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 설명 노트 */}
          {repairType.description && (
            <p className="text-xs text-gray-500 leading-relaxed">
              * {repairType.description}
            </p>
          )}
        </div>

        {/* 하단 확인 버튼 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
          <button
            onClick={() => setSubPartsView(null)}
            className="btn-outline px-5 py-4"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={confirmInlineSubParts}
            disabled={!canConfirm}
            className={cn(
              "flex-1 py-4 rounded-xl text-sm font-bold transition-colors",
              canConfirm
                ? "bg-[#00C896] text-white"
                : "bg-gray-100 text-gray-400"
            )}
          >
            {selectedMode === "all"
              ? "전체 선택으로 확인"
              : selectedIds.size > 0
              ? `${selectedIds.size}개 선택 확인`
              : "부위를 선택해주세요"}
          </button>
        </div>
      </div>
    );
  }

  // ── 메인 그리드 뷰 ──────────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* 헤더 */}
      <div className="px-4 py-4 border-b border-gray-100">
        {clothingType && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00C896]/10 rounded-full">
              <Scissors className="w-3.5 h-3.5 text-[#00C896]" />
              <span className="text-sm font-semibold text-[#00C896]">
                {clothingType}
              </span>
            </div>
          </div>
        )}
        <h2 className="text-lg font-bold text-gray-900">
          {clothingType ? "상세 수선 부위를 선택해주세요" : "수선 항목을 선택해주세요"}
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">복수 선택 가능</p>
      </div>

      {/* 선택된 항목 */}
      {selectedItems.length > 0 && (
        <div className="px-4 py-3 bg-[#00C896]/5 border-b border-[#00C896]/10">
          <p className="text-xs font-bold text-[#00C896] mb-2">선택된 항목</p>
          <div className="space-y-2">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-3 border border-[#00C896]/20"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800 flex-1 mr-2">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
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
                {item.detail && (
                  <p className="text-xs text-[#00C896] mt-0.5">{item.detail}</p>
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

      {/* 수선 종류 그리드 */}
      <div className="px-4 py-3">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
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
          <p className="text-sm text-gray-400 text-center py-8">수선 항목이 없습니다</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {repairTypes.map((type) => {
              const active = isRepairTypeActive(type);
              const displayName = type.sub_type
                ? `${type.name} (${type.sub_type})`
                : type.name;
              const iconSrc = getIconSrc(type.icon_name);

              return (
                <button
                  key={type.id}
                  onClick={() => handleTapRepairType(type)}
                  disabled={subPartsLoading}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all text-center min-h-[110px]",
                    active
                      ? "border-[#00C896] bg-[#00C896]/5"
                      : "border-gray-100 bg-white"
                  )}
                >
                  {/* 아이콘 */}
                  <div
                    className={cn(
                      "w-16 h-16 rounded-xl flex items-center justify-center transition-colors overflow-hidden",
                      active ? "bg-[#00C896]" : "bg-[#00C896]/10"
                    )}
                  >
                    {iconSrc ? (
                      <InlineSvg
                        src={iconSrc}
                        className={cn(
                          "w-10 h-10 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full",
                          active ? "text-white" : "text-[#00C896]"
                        )}
                        fallback={
                          <span className="text-3xl">
                            {getRepairTypeEmoji(type.name)}
                          </span>
                        }
                      />
                    ) : (
                      <span className="text-3xl">
                        {getRepairTypeEmoji(type.name)}
                      </span>
                    )}
                  </div>

                  {/* 이름 */}
                  <p
                    className={cn(
                      "text-sm font-bold leading-tight",
                      active ? "text-[#00C896]" : "text-gray-800"
                    )}
                  >
                    {displayName}
                  </p>

                  {/* 가격 */}
                  <p className="text-xs text-gray-400">
                    {type.price_range || formatPrice(type.price)}
                  </p>

                  {/* 세부항목/치수 있음 표시 */}
                  {(type.has_sub_parts || type.requires_measurement) && !active && (
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  )}

                  {/* 선택 완료 체크 */}
                  {active && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#00C896] flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        viewBox="0 0 12 12"
                        fill="currentColor"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          fill="none"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
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
              }))
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

      {/* ── 치수 입력 모달 ── */}
      {measureModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setMeasureModal(null)}
        >
          <div
            className="w-full max-w-[430px] bg-white rounded-t-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* 제목 */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900">치수를 입력해주세요</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {measureModal.repairType.sub_type
                    ? `${measureModal.repairType.name} (${measureModal.repairType.sub_type})`
                    : measureModal.repairType.name}
                  {measureModal.chosenParts && measureModal.chosenParts.length === 0
                    ? " · 전체"
                    : ""}
                </p>
              </div>
              <button
                onClick={() => setMeasureModal(null)}
                className="p-1 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 입력 필드 */}
            <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {(() => {
                const labels = getInputLabels(measureModal.repairType);
                const groups =
                  measureModal.chosenParts && measureModal.chosenParts.length > 0
                    ? measureModal.chosenParts.map((p) => ({
                        key: p.id,
                        title: p.name,
                      }))
                    : [{ key: "_single", title: "" }];
                return groups.map((group, gIdx) => (
                  <div key={group.key} className="space-y-3">
                    {group.title && (
                      <p className="text-xs font-bold text-[#00C896]">
                        {group.title}
                      </p>
                    )}
                    {labels.map((label, lIdx) => {
                      const idx = gIdx * labels.length + lIdx;
                      return (
                        <div key={lIdx}>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {label}
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="예: 30"
                            value={measureModal.values[idx] || ""}
                            onChange={(e) =>
                              setMeasureModal((prev) => {
                                if (!prev) return prev;
                                const next = [...prev.values];
                                next[idx] = e.target.value;
                                return { ...prev, values: next };
                              })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl text-sm outline-none focus:border-[#00C896]"
                          />
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>

            {/* 확인 버튼 */}
            <div className="px-5 pb-6">
              <button
                onClick={confirmMeasurement}
                className="w-full py-4 rounded-xl bg-[#00C896] text-white text-sm font-bold"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
