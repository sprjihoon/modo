"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { InlineSvg } from "@/components/ui/InlineSvg";
import type { RepairItem } from "./OrderNewClient";

interface Category {
  id: string;
  name: string;
  icon_name?: string;
  display_order?: number;
  sub_selection_label?: string;
  // 직접 가격/치수 필드
  price?: number | null;
  price_range?: string | null;
  requires_measurement?: boolean;
  input_count?: number;
  input_labels?: string[] | null;
  description?: string | null;
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

function formatPrice(price: number): string {
  return `${price.toLocaleString("ko-KR")}원`;
}

function getInputLabels(cat: Category): string[] {
  const count = cat.input_count ?? 1;
  if (Array.isArray(cat.input_labels) && cat.input_labels.length > 0) {
    return cat.input_labels;
  }
  return Array.from({ length: count }, () => "치수 (cm)");
}

interface SubCategoryStepProps {
  parentCategoryId?: string;
  parentCategoryName: string;
  onNext: (type: string, categoryId?: string, repairItem?: RepairItem | null) => void;
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

  // 세부카테고리 뷰 상태
  const [selectedMiddle, setSelectedMiddle] = useState<Category | null>(null);
  const [subChildren, setSubChildren] = useState<Category[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // 치수 입력 모달 (직접 가격 카테고리에 requires_measurement가 있을 때)
  const [measureModal, setMeasureModal] = useState<{
    category: Category;
    values: string[];
  } | null>(null);

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
        .select(
          "id, name, icon_name, display_order, sub_selection_label, price, price_range, requires_measurement, input_count, input_labels, description"
        )
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

  // 중카테고리 항목 클릭
  async function handleSelectMiddle(cat: Category) {
    // 직접 가격이 설정된 카테고리 → 수선 항목으로 바로 처리
    if (cat.price != null) {
      handleDirectPriceCategory(cat);
      return;
    }

    // 하위 항목 확인
    setIsLoadingDetail(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("repair_categories")
        .select(
          "id, name, icon_name, display_order, price, price_range, requires_measurement, input_count, input_labels, description"
        )
        .eq("is_active", true)
        .eq("parent_category_id", cat.id)
        .order("display_order", { ascending: true });

      if (!data || data.length === 0) {
        onNext(cat.name, cat.id);
      } else {
        setSelectedMiddle(cat);
        setSubChildren(data);
      }
    } catch {
      onNext(cat.name, cat.id);
    } finally {
      setIsLoadingDetail(false);
    }
  }

  // 세부카테고리 항목 클릭
  function handleSelectSub(cat: Category) {
    if (cat.price != null) {
      handleDirectPriceCategory(cat);
    } else {
      onNext(cat.name, cat.id);
    }
  }

  // 직접 가격 설정된 카테고리 처리
  function handleDirectPriceCategory(cat: Category) {
    if (cat.requires_measurement) {
      const labels = getInputLabels(cat);
      setMeasureModal({ category: cat, values: labels.map(() => "") });
    } else {
      const item: RepairItem = {
        name: cat.name,
        price: cat.price!,
        priceRange: cat.price_range || formatPrice(cat.price!),
        quantity: 1,
        detail: "",
      };
      onNext(cat.name, cat.id, item);
    }
  }

  // 치수 입력 확인
  function confirmMeasurement() {
    if (!measureModal) return;
    const { category, values } = measureModal;
    const labels = getInputLabels(category);
    const detail = labels
      .map((label, i) => `${label}: ${values[i] || "-"}`)
      .join(", ");

    const item: RepairItem = {
      name: category.name,
      price: category.price!,
      priceRange: category.price_range || formatPrice(category.price!),
      quantity: 1,
      detail,
    };
    setMeasureModal(null);
    onNext(category.name, category.id, item);
  }

  function handleDetailBack() {
    setSelectedMiddle(null);
    setSubChildren([]);
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

  // ── 세부카테고리 뷰 ──────────────────────────────────────────────────────
  if (selectedMiddle && subChildren.length > 0) {
    const middleIconSrc = getIconSrc(selectedMiddle.icon_name);
    const label =
      selectedMiddle.sub_selection_label ||
      `${selectedMiddle.name} 세부항목을 선택하세요`;

    return (
      <div>
        <div className="px-4 py-5">
          <h2 className="text-lg font-bold text-gray-900 mb-5">
            상세 수선 부위를 선택해주세요.
          </h2>

          {/* 선택된 중카테고리 카드 */}
          <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-14 h-14 flex items-center justify-center shrink-0">
              {middleIconSrc ? (
                <InlineSvg
                  src={middleIconSrc}
                  className="w-12 h-12 flex items-center justify-center text-gray-500 [&>svg]:w-full [&>svg]:h-full"
                  fallback={
                    <span className="text-4xl">
                      {getFallbackEmoji(selectedMiddle.name)}
                    </span>
                  }
                />
              ) : (
                <span className="text-4xl">
                  {getFallbackEmoji(selectedMiddle.name)}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-gray-800">
              {selectedMiddle.name}
            </span>
          </div>

          {/* 세부항목 선택 안내 문구 */}
          <p className="text-sm font-semibold text-gray-700 mb-3">{label}</p>

          {/* 세부카테고리 그리드 */}
          <div className="grid grid-cols-3 gap-3">
            {subChildren.map((cat) => {
              const iconSrc = getIconSrc(cat.icon_name);
              const hasDirect = cat.price != null;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectSub(cat)}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 border-gray-100 bg-white active:scale-95 active:border-[#00C896] transition-all"
                >
                  {iconSrc ? (
                    <InlineSvg
                      src={iconSrc}
                      className="w-16 h-16 flex items-center justify-center text-gray-500 [&>svg]:w-full [&>svg]:h-full"
                      fallback={
                        <div className="w-16 h-16 flex items-center justify-center">
                          <span className="text-4xl">
                            {getFallbackEmoji(cat.name)}
                          </span>
                        </div>
                      }
                    />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center">
                      <span className="text-4xl">
                        {getFallbackEmoji(cat.name)}
                      </span>
                    </div>
                  )}
                  <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                    {cat.name}
                  </span>
                  {hasDirect && (
                    <span className="text-[10px] text-gray-400">
                      {cat.price_range || formatPrice(cat.price!)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleDetailBack}
            className="mt-5 w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-500 font-semibold"
          >
            이전
          </button>
        </div>

        {/* 치수 입력 모달 */}
        {measureModal && (
          <MeasureModal
            category={measureModal.category}
            values={measureModal.values}
            onChange={(values) =>
              setMeasureModal((prev) => prev ? { ...prev, values } : prev)
            }
            onConfirm={confirmMeasurement}
            onClose={() => setMeasureModal(null)}
          />
        )}
      </div>
    );
  }

  // ── 중카테고리 목록 뷰 ───────────────────────────────────────────────────
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
            const hasDirect = cat.price != null;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelectMiddle(cat)}
                disabled={isLoadingDetail}
                className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 border-gray-100 bg-white active:scale-95 active:border-[#00C896] transition-all disabled:opacity-60"
              >
                {iconSrc ? (
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
                ) : (
                  <div className="w-20 h-20 flex items-center justify-center">
                    <span className="text-5xl">{getFallbackEmoji(cat.name)}</span>
                  </div>
                )}
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                  {cat.name}
                </span>
                {hasDirect && (
                  <span className="text-[10px] text-[#00C896] font-semibold">
                    {cat.price_range || formatPrice(cat.price!)}
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

      {/* 치수 입력 모달 */}
      {measureModal && (
        <MeasureModal
          category={measureModal.category}
          values={measureModal.values}
          onChange={(values) =>
            setMeasureModal((prev) => prev ? { ...prev, values } : prev)
          }
          onConfirm={confirmMeasurement}
          onClose={() => setMeasureModal(null)}
        />
      )}
    </div>
  );
}

// ── 치수 입력 모달 ────────────────────────────────────────────────────────
function MeasureModal({
  category,
  values,
  onChange,
  onConfirm,
  onClose,
}: {
  category: Category;
  values: string[];
  onChange: (values: string[]) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const labels = getInputLabels(category);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
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
            <p className="text-sm text-gray-500 mt-0.5">{category.name}</p>
            {category.description && (
              <p className="text-xs text-gray-400 mt-1">{category.description}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 입력 필드 */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {labels.map((label, i) => (
            <div key={i}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {label}
              </label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="예: 30"
                value={values[i] || ""}
                onChange={(e) => {
                  const next = [...values];
                  next[i] = e.target.value;
                  onChange(next);
                }}
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl text-sm outline-none focus:border-[#00C896]"
              />
            </div>
          ))}
        </div>

        {/* 확인 버튼 */}
        <div className="px-5 pb-6">
          <button
            onClick={onConfirm}
            className="w-full py-4 rounded-xl bg-[#00C896] text-white text-sm font-bold"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
