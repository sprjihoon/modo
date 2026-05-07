"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, X, Minus, Plus, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { RepairItem } from "./OrderNewClient";
import { InlineSvg } from "@/components/ui/InlineSvg";
import { createClient } from "@/lib/supabase/client";

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
  show_all_option: boolean;
  all_option_price?: number | null;
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
  childBackRef?: React.MutableRefObject<(() => boolean) | null>;
}

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
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
  childBackRef,
}: RepairTypeStepProps) {
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [subPartsLoading, setSubPartsLoading] = useState(false);
  const [categoryIconName, setCategoryIconName] = useState<string | null>(null);

  // 세부 부위 인라인 뷰 상태 (모달 대신 화면 전환)
  const [subPartsView, setSubPartsView] = useState<{
    repairType: RepairType;
    subParts: SubPart[];
    selectedMode: "all" | "specific";
    selectedIds: Set<string>;
  } | null>(null);
  // 자동으로 열린 경우 (repair type이 하나뿐일 때) 뒤로가기시 이전 단계로
  const [autoOpenedSubParts, setAutoOpenedSubParts] = useState(false);

  // 치수 입력 뷰 (인라인 풀페이지)
  const [measureView, setMeasureView] = useState<{
    repairType: RepairType;
    chosenParts?: SubPart[];
    overridePrice?: number;
  } | null>(null);
  const [measureValues, setMeasureValues] = useState<string[]>([]);

  function openMeasureView(repairType: RepairType, chosenParts?: SubPart[], overridePrice?: number) {
    const labels = getInputLabels(repairType);
    const groups = chosenParts && chosenParts.length > 0 ? chosenParts.length : 1;
    setMeasureValues(Array.from({ length: labels.length * groups }, () => ""));
    setMeasureView({ repairType, chosenParts, overridePrice });
  }

  const scrollRef = useRef<HTMLDivElement>(null);

  // 부모에게 내부 뒤로가기 핸들러 등록
  useEffect(() => {
    if (!childBackRef) return;
    childBackRef.current = () => {
      if (measureView) {
        setMeasureView(null);
        return true;
      }
      if (subPartsView) {
        if (autoOpenedSubParts) {
          // 자동으로 열린 경우 → 이전 단계로 돌아가기 (부모의 popMode 호출)
          return false;
        }
        setSubPartsView(null);
        return true;
      }
      return false;
    };
    return () => { childBackRef.current = null; };
  });

  useEffect(() => {
    loadRepairTypes();
    loadCategoryIcon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clothingType, clothingCategoryId]);

  async function loadCategoryIcon() {
    if (!clothingCategoryId) { setCategoryIconName(null); return; }
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("repair_categories")
        .select("icon_name")
        .eq("id", clothingCategoryId)
        .single();
      setCategoryIconName(data?.icon_name ?? null);
    } catch {
      setCategoryIconName(null);
    }
  }

  async function loadRepairTypes() {
    try {
      setIsLoading(true);
      setLoadError(false);

      const params = new URLSearchParams();
      if (clothingCategoryId) params.set("category_id", clothingCategoryId);

      const res = await fetch(`/api/repair-types?${params.toString()}`);
      const json = await res.json();

      const items: RepairType[] = json.data ?? [];

      const mapped = items.map((d) => ({
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
        show_all_option: d.show_all_option !== false,
        all_option_price: d.all_option_price ?? null,
        sub_parts_title: d.sub_parts_title ?? undefined,
        requires_multiple_inputs: d.requires_multiple_inputs ?? false,
        input_labels: d.input_labels ?? "치수 (cm)",
        input_count: d.input_count ?? 1,
      }));

      // has_sub_parts인 항목이 하나뿐이면 바로 세부 부위 뷰로 진입 (중간 목록 생략)
      const subPartsTypes = mapped.filter((t) => t.has_sub_parts);
      setRepairTypes(mapped);

      if (subPartsTypes.length === 1 && mapped.length === 1) {
        setAutoOpenedSubParts(true);
        await openSubPartsView(subPartsTypes[0]);
        setIsLoading(false);
      } else {
        setAutoOpenedSubParts(false);
        setIsLoading(false);
      }
    } catch {
      setLoadError(true);
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
      openMeasureView(type);
    } else {
      addSimpleItem(type);
    }
  }

  function addSimpleItem(type: RepairType, detail?: string, overridePrice?: number) {
    const effectivePrice = overridePrice ?? type.price;
    setSelectedItems((prev) => [
      ...prev,
      {
        id: type.id,
        name: type.sub_type ? `${type.name} (${type.sub_type})` : type.name,
        price: effectivePrice,
        priceRange: type.price_range || formatPrice(effectivePrice),
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
        if (type.requires_measurement) {
          openMeasureView(type);
        } else {
          addSimpleItem(type);
        }
        return;
      }

      setSubPartsView({
        repairType: type,
        subParts,
        selectedMode: type.show_all_option ? "all" : "specific",
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
      const allPrice = repairType.all_option_price ?? repairType.price;
      if (repairType.requires_measurement) {
        openMeasureView(repairType, [], allPrice);
      } else {
        addSimpleItem(repairType, undefined, allPrice);
      }
      return;
    }

    // 특정 부위 선택
    const chosenParts = subParts.filter((p) => selectedIds.has(p.id));
    if (chosenParts.length === 0) return;

    if (repairType.requires_measurement) {
      openMeasureView(repairType, chosenParts);
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

  function confirmMeasurement(values: string[]) {
    if (!measureView) return;
    const { repairType, chosenParts, overridePrice } = measureView;
    const labels = getInputLabels(repairType);

    if (!chosenParts || chosenParts.length === 0) {
      const detail = labels
        .map((label, i) => `${label}: ${values[i] || "-"}`)
        .join(", ");
      addSimpleItem(repairType, detail, overridePrice);
      setMeasureView(null);
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
    setMeasureView(null);
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
            {selectionLabel}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* 선택된 수선 항목 카드 - 소카테고리 이름/아이콘 우선 표시 */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
            {(() => {
              const iconSrc = getIconSrc(categoryIconName ?? undefined) || rtIconSrc;
              if (iconSrc) {
                return (
                  <div className="w-10 h-10 rounded-xl bg-[#00C896]/10 flex items-center justify-center shrink-0">
                    {iconSrc.startsWith("http") ? (
                      <img src={iconSrc} alt={clothingType || repairType.name} className="w-7 h-7 object-contain" />
                    ) : (
                      <InlineSvg
                        src={iconSrc}
                        className="w-7 h-7 flex items-center justify-center text-[#00C896] [&>svg]:w-full [&>svg]:h-full"
                      />
                    )}
                  </div>
                );
              }
              return null;
            })()}
            <span className="text-sm font-semibold text-gray-800">
              {clothingType || (repairType.sub_type
                ? `${repairType.name} (${repairType.sub_type})`
                : repairType.name)}
            </span>
          </div>

          {/* 전체 / 특정 부위 선택 라디오 */}
          <div>
            {repairType.show_all_option && (
              <p className="text-sm font-semibold text-gray-700 mb-3">
                수선 범위를 선택해주세요
              </p>
            )}
            {repairType.show_all_option ? (
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
            ) : null}
          </div>

          {/* 세부 부위 카드 그리드 (특정 부위 선택 시) */}
          {selectedMode === "specific" && (
            <div>
              {repairType.show_all_option && (
                <p className="text-xs text-gray-500 mb-3">
                  {selectionLabel}
                  {repairType.allow_multiple_sub_parts ? " (다중 선택 가능)" : ""}
                </p>
              )}
              {!repairType.show_all_option && repairType.allow_multiple_sub_parts && (
                <p className="text-xs text-gray-500 mb-3">복수 선택 가능</p>
              )}
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
                          partIconSrc.startsWith("http") ? (
                            <img src={partIconSrc} alt={part.name} className="w-10 h-10 object-contain" />
                          ) : (
                            <InlineSvg
                              src={partIconSrc}
                              className="w-10 h-10 flex items-center justify-center text-[#00C896] [&>svg]:w-full [&>svg]:h-full"
                            />
                          )
                        ) : null}
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

  // ── 치수 입력 인라인 뷰 ───────────────────────────────────────────────────
  if (measureView) {
    const { repairType, chosenParts } = measureView;
    const labels = getInputLabels(repairType);
    const effectiveGroups = chosenParts && chosenParts.length > 0
      ? chosenParts.map((p) => ({ key: p.id, title: p.name }))
      : [{ key: "_single", title: "" }];
    const hasAnyValue = measureValues.some((v) => v.trim() !== "");

    return (
      <div className="flex flex-col min-h-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">치수를 입력해주세요</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* 선택된 항목 카드 - 소카테고리 이름/아이콘 우선 표시 */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-[#00C896]/10 flex items-center justify-center shrink-0">
              {(() => {
                const iconSrc = getIconSrc(categoryIconName ?? undefined) || getIconSrc(repairType.icon_name);
                if (iconSrc) {
                  return iconSrc.startsWith("http") ? (
                    <img src={iconSrc} alt={clothingType || repairType.name} className="w-7 h-7 object-contain" />
                  ) : (
                    <InlineSvg
                      src={iconSrc}
                      className="w-7 h-7 flex items-center justify-center text-[#00C896] [&>svg]:w-full [&>svg]:h-full"
                    />
                  );
                }
                const displayName = clothingType || repairType.name;
                return (
                  <span className="text-[#00C896] text-lg font-bold">
                    {displayName.charAt(0)}
                  </span>
                );
              })()}
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-gray-800">
                {clothingType || (repairType.sub_type
                  ? `${repairType.name} (${repairType.sub_type})`
                  : repairType.name)}
              </span>
              {(measureView.overridePrice ?? repairType.price) > 0 && (
                <p className="text-xs text-[#00C896]">{formatPrice(measureView.overridePrice ?? repairType.price)}</p>
              )}
            </div>
          </div>

          {/* 입력 필드 */}
          {effectiveGroups.map((group, gIdx) => (
            <div key={group.key} className="space-y-3">
              {group.title && (
                <p className="text-xs font-bold text-[#00C896]">{group.title}</p>
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
                      value={measureValues[idx] || ""}
                      onChange={(e) => {
                        const next = [...measureValues];
                        next[idx] = e.target.value;
                        setMeasureValues(next);
                      }}
                      className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-xl text-base outline-none focus:border-[#00C896] transition-colors"
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 하단 버튼 */}
        <div className="px-4 py-4 border-t border-gray-50 flex gap-3">
          <button
            onClick={() => setMeasureView(null)}
            className="flex-1 py-3.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500"
          >
            이전
          </button>
          <button
            onClick={() => confirmMeasurement(measureValues)}
            disabled={!hasAnyValue}
            className="flex-[2] py-3.5 rounded-xl bg-[#00C896] text-white text-sm font-bold disabled:opacity-40 transition-opacity"
          >
            확인
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
          <div className="flex items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-5 py-3 bg-[#00C896]/10 rounded-2xl border border-[#00C896]/20">
              {categoryIconName && (() => {
                const src = getIconSrc(categoryIconName);
                return src ? (
                  src.startsWith("http") ? (
                    <img src={src} alt={clothingType} className="w-7 h-7 object-contain" />
                  ) : (
                    <InlineSvg
                      src={src}
                      className="w-7 h-7 flex items-center justify-center text-[#00C896] [&>svg]:w-full [&>svg]:h-full"
                    />
                  )
                ) : null;
              })()}
              <span className="text-lg font-bold text-[#00C896]">
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
              const iconSrc = getIconSrc(type.icon_name) || getIconSrc(categoryIconName ?? undefined);

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
                  {/* 아이콘 (등록된 경우에만 표시, 없으면 카테고리 아이콘 폴백) */}
                  {iconSrc && (
                    <div
                      className={cn(
                        "w-16 h-16 rounded-xl flex items-center justify-center transition-colors overflow-hidden",
                        active ? "bg-[#00C896]" : "bg-[#00C896]/10"
                      )}
                    >
                      {iconSrc.startsWith("http") ? (
                        <img
                          src={iconSrc}
                          alt={type.name}
                          className={cn(
                            "w-10 h-10 object-contain",
                            active ? "brightness-0 invert" : ""
                          )}
                        />
                      ) : (
                        <InlineSvg
                          src={iconSrc}
                          className={cn(
                            "w-10 h-10 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full",
                            active ? "text-white" : "text-[#00C896]"
                          )}
                        />
                      )}
                    </div>
                  )}

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

    </div>
  );
}
