"use client";

import { useMemo, useState } from "react";
import { CheckCircle, Clock, Package, Scissors, Truck } from "lucide-react";
import { RepairPhotosCompare } from "./RepairPhotosCompare";
import { buildRepairPhotoItems } from "@/lib/repair-photos";
import {
  MOCK_REPAIR_PARTS,
  REPAIR_PHOTO_DEMO_SCENARIOS,
  type RepairPhotoDemoScenarioId,
} from "@/lib/repair-photos-mock";

const FLOW_STEPS = [
  {
    title: "1. 입고 촬영",
    body: "어드민 입고에서 항목마다 before_photo 를 media 에 저장합니다. sequence 는 수선 항목 번호입니다.",
  },
  {
    title: "2. 출고 촬영",
    body: "어드민 출고에서 같은 sequence 로 after_photo 를 올립니다. 입고·출고 영상은 고객에게 보이지 않습니다.",
  },
  {
    title: "3. 고객 조회",
    body: "주문상세가 회수/배송 송장번호와 주문 ID로 media 를 찾습니다. type 은 before_photo, after_photo 만 씁니다.",
  },
  {
    title: "4. 묶어서 표시",
    body: "sequence 로 전·후를 한 줄에 붙이고, 이름은 repair_parts[sequence - 1] 입니다. 사진이 한 장이라도 있으면 섹션이 나옵니다.",
  },
];

const TIMELINE = [
  { key: "BOOKED", label: "수거예약", icon: Clock },
  { key: "PICKED_UP", label: "수거완료", icon: Truck },
  { key: "INBOUND", label: "입고완료", icon: Package },
  { key: "PROCESSING", label: "수선중", icon: Scissors },
  { key: "READY_TO_SHIP", label: "출고완료", icon: Truck },
  { key: "OUT_FOR_DELIVERY", label: "배송중", icon: Truck },
  { key: "DELIVERED", label: "배송완료", icon: CheckCircle },
];

const STATUS_STEP: Record<string, number> = {
  PICKED_UP: 1,
  INBOUND: 2,
  PROCESSING: 3,
  READY_TO_SHIP: 4,
};

export function RepairPhotoDemoClient() {
  const [scenarioId, setScenarioId] = useState<RepairPhotoDemoScenarioId>("mixed");
  const scenario =
    REPAIR_PHOTO_DEMO_SCENARIOS.find((item) => item.id === scenarioId) ??
    REPAIR_PHOTO_DEMO_SCENARIOS[0];

  const items = useMemo(
    () =>
      buildRepairPhotoItems({
        photos: scenario.photos,
        repairParts: MOCK_REPAIR_PARTS,
      }),
    [scenario],
  );

  const currentStep = STATUS_STEP[scenario.status] ?? 0;

  return (
    <div className="pb-10 bg-gray-50 min-h-full">
      <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
        목업 미리보기입니다. 실제 주문 데이터가 아니라, 고객 주문상세와 같은 함수·UI로 흐름을 보는 화면입니다.
      </div>

      <div className="mx-4 mt-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <p className="text-sm font-bold text-gray-800 mb-3">시나리오</p>
        <div className="grid grid-cols-2 gap-2">
          {REPAIR_PHOTO_DEMO_SCENARIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScenarioId(item.id)}
              className={`px-3 py-2.5 rounded-xl text-left text-xs font-semibold border transition-colors ${
                scenarioId === item.id
                  ? "bg-[#00C896]/10 border-[#00C896] text-[#00C896]"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              {item.title}
              <span className="block mt-0.5 font-medium text-gray-400">{item.statusLabel}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-gray-500">{scenario.summary}</p>
      </div>

      <div className="mx-4 mt-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <p className="text-sm font-bold text-gray-800 mb-4">고객에게 보이는 위치</p>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TIMELINE.map((step, index) => {
            const done = index <= currentStep;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex flex-col items-center min-w-[52px]">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    done ? "bg-[#00C896] text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <p className={`mt-1 text-[10px] ${done ? "text-gray-700" : "text-gray-400"}`}>
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <RepairPhotosCompare items={items} />

      {items.length === 0 && (
        <div className="mx-4 mt-3 p-5 bg-white border border-dashed border-gray-200 rounded-2xl text-center">
          <p className="text-sm font-bold text-gray-700">섹션 숨김</p>
          <p className="mt-1 text-xs text-gray-400">
            `repairPhotoItems.length === 0` 이면 주문상세에 수선 전·후 사진 카드가 렌더되지 않습니다.
          </p>
        </div>
      )}

      <div className="mx-4 mt-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <p className="text-sm font-bold text-gray-800 mb-3">데이터 흐름</p>
        <ol className="space-y-3">
          {FLOW_STEPS.map((step) => (
            <li key={step.title}>
              <p className="text-xs font-bold text-gray-700">{step.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-gray-500">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mx-4 mt-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <p className="text-sm font-bold text-gray-800 mb-2">이번 시나리오 입력 → 출력</p>
        <p className="text-[11px] text-gray-400 mb-2">
          media {scenario.photos.length}행 · repair_parts {MOCK_REPAIR_PARTS.length}개 → items {items.length}개
        </p>
        <pre className="text-[11px] leading-5 text-gray-600 bg-gray-50 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(
  {
    lookupKeys: ["pickup_tracking_no", "delivery_tracking_no", "order.id"],
    media: scenario.photos.map((photo) => ({
      type: photo.type,
      sequence: photo.sequence,
      provider: photo.provider,
      path: photo.path?.startsWith("data:") ? "(mock svg)" : photo.path,
    })),
    repair_parts: MOCK_REPAIR_PARTS.map((part) => part.name),
    items: items.map((item) => ({
      sequence: item.sequence,
      label: item.label,
      before: item.before ? "있음" : "없음",
      after: item.after ? "있음" : "없음",
    })),
  },
  null,
  2,
)}
        </pre>
      </div>
    </div>
  );
}
