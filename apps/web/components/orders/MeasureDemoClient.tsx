"use client";

import { useMemo, useState } from "react";
import {
  buildMeasureFieldGroups,
  detailFromMeasureGroup,
  measureFieldCount,
} from "@/lib/repair-sub-parts-flow";
import {
  MEASURE_DEMO_SCENARIOS,
  MOCK_PARENT_LABELS,
  MOCK_WAIST_HIP_PARTS,
  type MeasureDemoScenarioId,
} from "@/lib/repair-measure-mock";

export function MeasureDemoClient() {
  const [scenarioId, setScenarioId] = useState<MeasureDemoScenarioId>("combo");
  const scenario =
    MEASURE_DEMO_SCENARIOS.find((item) => item.id === scenarioId) ??
    MEASURE_DEMO_SCENARIOS[0];
  const groups = useMemo(() => {
    const parts = MOCK_WAIST_HIP_PARTS.filter((part) =>
      scenario.partIds.includes(part.id),
    );
    return buildMeasureFieldGroups({
      fallbackLabels: MOCK_PARENT_LABELS,
      parts,
    });
  }, [scenario.partIds]);
  const [values, setValues] = useState<string[]>(() =>
    Array.from({ length: measureFieldCount(groups) }, () => ""),
  );

  function selectScenario(id: MeasureDemoScenarioId) {
    setScenarioId(id);
    const nextParts = MOCK_WAIST_HIP_PARTS.filter((part) =>
      (MEASURE_DEMO_SCENARIOS.find((item) => item.id === id)?.partIds ?? []).includes(
        part.id,
      ),
    );
    const nextGroups = buildMeasureFieldGroups({
      fallbackLabels: MOCK_PARENT_LABELS,
      parts: nextParts,
    });
    setValues(Array.from({ length: measureFieldCount(nextGroups) }, () => ""));
  }

  let offset = 0;
  const details = groups.map((group) => {
    const detail = detailFromMeasureGroup(group, values, offset);
    offset += group.labels.length;
    return { title: group.title, detail };
  });

  return (
    <div className="pb-10 bg-gray-50 min-h-full">
      <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
        목업 미리보기입니다. 실제 주문 데이터가 아니라, 고객 치수 입력과 같은 함수로 허리+힙 2칸 흐름을 확인하는 화면입니다.
      </div>

      <div className="mx-4 mt-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <p className="text-sm font-bold text-gray-800 mb-3">시나리오</p>
        <div className="grid grid-cols-3 gap-2">
          {MEASURE_DEMO_SCENARIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectScenario(item.id)}
              className={`px-3 py-2.5 rounded-xl text-left text-xs font-semibold border transition-colors ${
                scenarioId === item.id
                  ? "bg-[#00C896]/10 border-[#00C896] text-[#00C896]"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-gray-500">{scenario.summary}</p>
      </div>

      <div className="mx-4 mt-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-5">
        <p className="text-sm font-bold text-gray-800">치수를 입력해주세요</p>
        {groups.map((group, gIdx) => {
          const start = groups
            .slice(0, gIdx)
            .reduce((sum, item) => sum + item.labels.length, 0);
          return (
            <div key={group.key} className="space-y-3">
              {group.title && (
                <p className="text-xs font-bold text-[#00C896]">{group.title}</p>
              )}
              {group.labels.map((label, lIdx) => {
                const idx = start + lIdx;
                return (
                  <div key={`${group.key}-${label}`}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {label}
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="예: 3"
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
          );
        })}
      </div>

      <div className="mx-4 mt-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <p className="text-sm font-bold text-gray-800 mb-2">주문에 저장될 수치</p>
        <pre className="text-[11px] leading-5 text-gray-600 bg-gray-50 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(
  {
    parentLabels: MOCK_PARENT_LABELS,
    fields: measureFieldCount(groups),
    details,
  },
  null,
  2,
)}
        </pre>
      </div>
    </div>
  );
}
