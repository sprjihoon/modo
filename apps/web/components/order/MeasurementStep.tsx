"use client";

import { useState } from "react";
import { InlineSvg } from "@/components/ui/inline-svg";
import { MeasureGuideAccordion } from "@/components/guide/MeasureGuideAccordion";
import { MeasureGuideSideWidget } from "@/components/guide/MeasureGuideSideWidget";
import { resolveMeasureGuideId } from "@/lib/measure-guide";

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
  notes?: string | null;
  measureGuideKey?: string | null;
  clothingHint?: string | null;
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
  const noteLines = config.notes
    ? config.notes.split("\n").map((l) => l.trim()).filter(Boolean)
    : [];

  const guideTypeId = resolveMeasureGuideId(itemName, {
    measureGuideKey: config.measureGuideKey,
    clothingHint: config.clothingHint,
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* PC: ?ºÏ™Ω ?¨Ïù¥???ÑÏ†Ø */}
      <MeasureGuideSideWidget initialTypeId={guideTypeId} />

      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">ÏπòÏàòÎ•??ÖÎ†•?¥Ï£º?∏Ïöî</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
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
              <p className="text-xs text-[#00C896]">{price.toLocaleString("ko-KR")}??/p>
            )}
          </div>
        </div>

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
                    placeholder="?? 30"
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

        {/* Î™®Î∞î???úÎ∏îÎ¶? ?îÎ©¥ ???ÑÏΩî?îÏñ∏ (PC???¨Ïù¥???ÑÏ†Ø) */}
        <div className="lg:hidden">
          <MeasureGuideAccordion initialTypeId={guideTypeId} defaultOpen />
        </div>
      </div>

      {noteLines.length > 0 && (
        <div className="px-4 pb-4">
          <ul className="space-y-2">
            {noteLines.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-500 leading-relaxed">
                <span className="mt-0.5 shrink-0">??/span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="sticky bottom-0 bg-white px-4 py-4 border-t border-gray-50 flex gap-3">
        <button
          onClick={onBack}
          className="touch-target flex-1 py-3.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500"
        >
          ?¥Ï†Ñ
        </button>
        <button
          onClick={() => onConfirm(values)}
          disabled={!hasAnyValue}
          className="touch-target flex-[2] py-3.5 rounded-xl bg-[#00C896] text-white text-sm font-bold disabled:opacity-40 transition-opacity"
        >
          ?ïÏù∏
        </button>
      </div>
    </div>
  );
}
