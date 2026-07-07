"use client";

import { useState, useEffect, useCallback } from "react";
import Barcode from "react-barcode";
import { Eye, EyeOff, Save, RotateCcw } from "lucide-react";

interface LabelLayout {
  showCustomerName: boolean;
  showItemName: boolean;
  showRepairPart: boolean;
  showDate: boolean;
  showSeq: boolean;
  barcodeHeight: number;
  fontSize: "xs" | "sm" | "md";
  labelWidthMm: number;
  labelHeightMm: number;
}

const DEFAULT_LAYOUT: LabelLayout = {
  showCustomerName: true,
  showItemName: true,
  showRepairPart: true,
  showDate: true,
  showSeq: true,
  barcodeHeight: 40,
  fontSize: "xs",
  labelWidthMm: 70,
  labelHeightMm: 30,
};

const STORAGE_KEY = "barcode-label-layout";

const FONT_SIZE_MAP = {
  xs: { main: "9px", sub: "8px", code: "8px" },
  sm: { main: "10px", sub: "9px", code: "9px" },
  md: { main: "11px", sub: "10px", code: "10px" },
};

const PRESETS = [
  { label: "70×30mm (기본)", w: 70, h: 30 },
  { label: "62×29mm", w: 62, h: 29 },
  { label: "80×40mm", w: 80, h: 40 },
  { label: "50×25mm", w: 50, h: 25 },
];

const SAMPLE = {
  barcodeValue: "623456789012-01",
  customerName: "홍길동",
  itemName: "자켓 수선",
  repairPart: "소매기장 줄임 - 기본형",
  date: "2026. 07. 07.",
  seq: "1/2",
};

export default function BarcodeLayoutPage() {
  const [layout, setLayout] = useState<LabelLayout>(DEFAULT_LAYOUT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setLayout({ ...DEFAULT_LAYOUT, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const update = useCallback((patch: Partial<LabelLayout>) => {
    setSaved(false);
    setLayout((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  const handleReset = () => {
    setLayout(DEFAULT_LAYOUT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LAYOUT));
    setSaved(false);
  };

  const fonts = FONT_SIZE_MAP[layout.fontSize];

  // mm → px 변환 (화면 미리보기용 — 실제 인쇄 크기와 동일하게 표시)
  const MM_TO_PX = 3.7795;
  const previewW = layout.labelWidthMm * MM_TO_PX;
  const previewH = layout.labelHeightMm * MM_TO_PX;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">바코드 레이아웃 설정</h1>
          <p className="text-sm text-gray-500 mt-1">
            내부 바코드 라벨의 크기와 표시 항목을 설정합니다. 저장 후 인쇄 페이지에 즉시 반영됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            초기화
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              saved
                ? "bg-green-600 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <Save className="h-4 w-4" />
            {saved ? "저장됨 ✓" : "저장"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 설정 패널 ── */}
        <div className="space-y-5">

          {/* 라벨 크기 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">라벨 크기</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">가로 (mm)</label>
                <input
                  type="number"
                  min={40} max={120}
                  value={layout.labelWidthMm}
                  onChange={(e) => update({ labelWidthMm: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">세로 (mm)</label>
                <input
                  type="number"
                  min={20} max={80}
                  value={layout.labelHeightMm}
                  onChange={(e) => update({ labelHeightMm: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(({ label, w, h }) => (
                <button
                  key={label}
                  onClick={() => update({ labelWidthMm: w, labelHeightMm: h })}
                  className={`px-3 py-1.5 rounded-lg text-xs border font-medium transition-colors ${
                    layout.labelWidthMm === w && layout.labelHeightMm === h
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 바코드 높이 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">바코드 높이</h2>
              <span className="text-sm font-mono text-blue-600">{layout.barcodeHeight}px</span>
            </div>
            <input
              type="range"
              min={20} max={70} step={2}
              value={layout.barcodeHeight}
              onChange={(e) => update({ barcodeHeight: Number(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>20px (작게)</span>
              <span>70px (크게)</span>
            </div>
          </div>

          {/* 글자 크기 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">글자 크기</h2>
            <div className="grid grid-cols-3 gap-2">
              {(["xs", "sm", "md"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => update({ fontSize: s })}
                  className={`py-2.5 rounded-lg text-sm border font-medium transition-colors ${
                    layout.fontSize === s
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s === "xs" ? "소 (8~9px)" : s === "sm" ? "중 (9~10px)" : "대 (10~11px)"}
                </button>
              ))}
            </div>
          </div>

          {/* 표시 항목 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">표시 항목</h2>
            <div className="space-y-2">
              {(
                [
                  { key: "showCustomerName", label: "고객명", desc: "홍길동" },
                  { key: "showItemName", label: "수선 항목", desc: "자켓 수선" },
                  { key: "showRepairPart", label: "수선 부위", desc: "소매기장 줄임" },
                  { key: "showDate", label: "입고일", desc: "2026. 07. 07." },
                  { key: "showSeq", label: "순번 (N/총N)", desc: "1/2" },
                ] as { key: keyof LabelLayout; label: string; desc: string }[]
              ).map(({ key, label, desc }) => {
                const on = layout[key] as boolean;
                return (
                  <button
                    key={key}
                    onClick={() => update({ [key]: !on })}
                    className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg text-sm transition-colors ${
                      on
                        ? "border-blue-200 bg-blue-50"
                        : "border-gray-200 bg-gray-50 opacity-60"
                    }`}
                  >
                    <div className="text-left">
                      <p className={`font-medium ${on ? "text-gray-900" : "text-gray-500"}`}>{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    </div>
                    {on ? (
                      <Eye className="h-4 w-4 text-blue-600 shrink-0" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 미리보기 ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-1">미리보기</h2>
            <p className="text-xs text-gray-400 mb-4">
              실제 인쇄 크기 ({layout.labelWidthMm}×{layout.labelHeightMm}mm) 기준으로 표시됩니다.
            </p>

            <div className="flex justify-center">
              <div
                className="bg-white border-2 border-gray-400 flex flex-col items-center justify-center overflow-hidden"
                style={{
                  width: `${previewW}px`,
                  height: `${previewH}px`,
                  padding: "2mm",
                  boxSizing: "border-box",
                }}
              >
                {/* 바코드 */}
                <div className="flex-shrink-0">
                  <Barcode
                    value={SAMPLE.barcodeValue}
                    format="CODE128"
                    width={1.2}
                    height={layout.barcodeHeight}
                    displayValue={false}
                    margin={0}
                  />
                </div>

                <p className="font-mono tracking-tight text-gray-800 leading-tight" style={{ fontSize: fonts.code }}>
                  {SAMPLE.barcodeValue}
                </p>

                {layout.showCustomerName && (
                  <p className="font-bold text-gray-900 leading-tight" style={{ fontSize: fonts.main }}>
                    {SAMPLE.customerName}
                    {layout.showSeq && (
                      <span className="font-normal text-gray-500 ml-1">({SAMPLE.seq})</span>
                    )}
                  </p>
                )}

                {layout.showItemName && (
                  <p className="text-gray-700 leading-tight text-center" style={{ fontSize: fonts.sub }}>
                    {SAMPLE.itemName}
                  </p>
                )}

                {layout.showRepairPart && (
                  <p className="text-blue-700 font-medium leading-tight text-center" style={{ fontSize: fonts.sub }}>
                    {SAMPLE.repairPart}
                  </p>
                )}

                {layout.showDate && (
                  <p className="text-gray-400 leading-tight" style={{ fontSize: fonts.sub }}>
                    입고일 {SAMPLE.date}
                  </p>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 mt-3">
              ※ 샘플 데이터 기준 미리보기
            </p>
          </div>

          {/* 안내 */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1">
            <p className="font-semibold">💡 안내</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-700">
              <li>설정은 이 브라우저에 저장됩니다.</li>
              <li>바코드 번호는 <strong>수거송장번호-01</strong> 형식으로 인쇄됩니다.</li>
              <li>라벨 크기는 프린터(HPRT SL43 등) 설정과 일치시켜야 합니다.</li>
              <li>저장 후 인쇄 페이지에서 즉시 적용됩니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
