"use client";

import { useState } from "react";
import { InlineSvg } from "@/components/ui/InlineSvg";

export interface MeasurementGroup {
  key: string;
  title: string;
}

export interface MeasurementConfig {
  itemName: string;
  subType?: string;
  labels: string[];
  groups?: MeasurementGroup[];
  price?: number;
  iconName?: string;
}

interface MeasurementStepProps {
  config: MeasurementConfig;
  onConfirm: (values: string[]) => void;
  onBack: () => void;
}

function getIconSrc(iconName?: string): string | null {
  if (!iconName) return null;
  if (iconName.startsWith("http")) return iconName;
  return `/icons/${iconName.toLowerCase().replace(/\.svg$/, "")}.svg`;
}

export function MeasurementStep({ config, onConfirm, onBack }: MeasurementStepProps) {
  const { itemName, subType, labels, groups, price, iconName } = config;
  const iconSrc = getIconSrc(iconName);
  const effectiveGroups = groups && groups.length > 0 ? groups : [{ key: "_single", title: "" }];
  const totalFields = labels.length * effectiveGroups.length;
  const [values, setValues] = useState<string[]>(Array.from({ length: totalFields }, () => ""));

  const displayName = subType ? `${itemName} (${subType})` : itemName;
  const hasAnyValue = values.some((v) => v.trim() !== "");

  return (
    <div className="flex flex-col min-h-0">
      {/* 헤더 */}
      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">치수를 입력해주세요</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* 선택된 항목 카드 */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-[#00C896]/10 flex items-center justify-center shrink-0">
            {iconSrc ? (
              iconSrc.startsWith("http") ? (
                <img src={iconSrc} alt={itemName} className="w-7 h-7 object-contain" />
              ) : (
                <InlineSvg
                  src={iconSrc}
                  className="w-7 h-7 flex items-center justify-center text-[#00C896] [&>svg]:w-full [&>svg]:h-full"
                />
              )
            ) : (
              <span className="text-[#00C896] text-lg font-bold">
                {itemName.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1">
            <span className="text-sm font-semibold text-gray-800">{displayName}</span>
            {price != null && price > 0 && (
              <p className="text-xs text-[#00C896]">{price.toLocaleString("ko-KR")}원</p>
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
                    value={values[idx] || ""}
                    onChange={(e) => {
                      const next = [...values];
                      next[idx] = e.target.value;
                      setValues(next);
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
          onClick={onBack}
          className="flex-1 py-3.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500"
        >
          이전
        </button>
        <button
          onClick={() => onConfirm(values)}
          disabled={!hasAnyValue}
          className="flex-[2] py-3.5 rounded-xl bg-[#00C896] text-white text-sm font-bold disabled:opacity-40 transition-opacity"
        >
          확인
        </button>
      </div>
    </div>
  );
}
