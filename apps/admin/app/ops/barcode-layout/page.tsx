"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Barcode from "react-barcode";
import { Save, RotateCcw, Download, Eye, EyeOff } from "lucide-react";

/* ────────────────────────────────────────────────
   타입 정의
──────────────────────────────────────────────── */
export interface BarcodeLayoutElement {
  fieldKey: string;
  label: string;
  exampleValue: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontSize: number;   // px
  isBold: boolean;
  letterSpacing: number;
  visible: boolean;
  type: "barcode" | "text";
}

export interface BarcodeLayoutConfig {
  labelWidthMm: number;
  labelHeightMm: number;
  elements: BarcodeLayoutElement[];
}

/* ────────────────────────────────────────────────
   상수
──────────────────────────────────────────────── */
export const BARCODE_LAYOUT_KEY = "barcode-label-layout-v2";

const DEFAULT_ELEMENTS: BarcodeLayoutElement[] = [
  {
    fieldKey: "barcode",
    label: "바코드 이미지",
    exampleValue: "623456789012-01",
    xMm: 1, yMm: 1, widthMm: 68, heightMm: 14,
    fontSize: 10, isBold: false, letterSpacing: 0, visible: true, type: "barcode",
  },
  {
    fieldKey: "barcode_no",
    label: "바코드 번호",
    exampleValue: "623456789012-01",
    xMm: 1, yMm: 15.5, widthMm: 68, heightMm: 3,
    fontSize: 8, isBold: false, letterSpacing: 0, visible: true, type: "text",
  },
  {
    fieldKey: "customer_name",
    label: "고객명 + 순번",
    exampleValue: "홍길동 (1/2)",
    xMm: 1, yMm: 19, widthMm: 38, heightMm: 4,
    fontSize: 9, isBold: true, letterSpacing: 0, visible: true, type: "text",
  },
  {
    fieldKey: "item_name",
    label: "수선 항목",
    exampleValue: "자켓 수선",
    xMm: 1, yMm: 23, widthMm: 44, heightMm: 3,
    fontSize: 8, isBold: false, letterSpacing: 0, visible: true, type: "text",
  },
  {
    fieldKey: "repair_part",
    label: "수선 부위",
    exampleValue: "소매기장 줄임",
    xMm: 1, yMm: 26.5, widthMm: 44, heightMm: 3,
    fontSize: 8, isBold: false, letterSpacing: 0, visible: true, type: "text",
  },
  {
    fieldKey: "date",
    label: "입고일",
    exampleValue: "입고일 2026.07.07",
    xMm: 46, yMm: 23, widthMm: 23, heightMm: 3,
    fontSize: 7, isBold: false, letterSpacing: 0, visible: true, type: "text",
  },
];

export const DEFAULT_CONFIG: BarcodeLayoutConfig = {
  labelWidthMm: 70,
  labelHeightMm: 30,
  elements: DEFAULT_ELEMENTS,
};

/* ────────────────────────────────────────────────
   유틸
──────────────────────────────────────────────── */
export function loadBarcodeLayout(): BarcodeLayoutConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const s = localStorage.getItem(BARCODE_LAYOUT_KEY);
    if (s) return { ...DEFAULT_CONFIG, ...JSON.parse(s) };
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveBarcodeLayout(cfg: BarcodeLayoutConfig) {
  localStorage.setItem(BARCODE_LAYOUT_KEY, JSON.stringify(cfg));
}

/* ────────────────────────────────────────────────
   에디터 페이지
──────────────────────────────────────────────── */
const DISPLAY_PX_PER_MM = 9; // 화면 표시 스케일

function mmToPx(mm: number) { return mm * DISPLAY_PX_PER_MM; }
function pxToMm(px: number) { return px / DISPLAY_PX_PER_MM; }

export default function BarcodeLayoutPage() {
  const [config, setConfig] = useState<BarcodeLayoutConfig>(DEFAULT_CONFIG);
  const [elements, setElements] = useState<BarcodeLayoutElement[]>(DEFAULT_ELEMENTS);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ mx: number; my: number; w: number; h: number } | null>(null);
  const [saved, setSaved] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // 로드
  useEffect(() => {
    const cfg = loadBarcodeLayout();
    setConfig(cfg);
    setElements(cfg.elements);
  }, []);

  const selectedEl = elements.find((e) => e.fieldKey === selected) ?? null;

  /* ── 저장 ── */
  const handleSave = () => {
    const cfg: BarcodeLayoutConfig = { ...config, elements };
    saveBarcodeLayout(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /* ── 기본값 초기화 ── */
  const handleReset = () => {
    if (!confirm("기본 레이아웃으로 초기화하시겠습니까?")) return;
    setConfig(DEFAULT_CONFIG);
    setElements(DEFAULT_ELEMENTS);
  };

  /* ── 저장된 양식 불러오기 ── */
  const handleLoad = () => {
    const cfg = loadBarcodeLayout();
    setConfig(cfg);
    setElements(cfg.elements);
    alert("저장된 레이아웃을 불러왔습니다.");
  };

  /* ── 요소 업데이트 헬퍼 ── */
  const updateEl = useCallback(
    (fieldKey: string, patch: Partial<BarcodeLayoutElement>) => {
      setElements((prev) =>
        prev.map((el) => (el.fieldKey === fieldKey ? { ...el, ...patch } : el))
      );
    },
    []
  );

  /* ── 드래그 시작 ── */
  const onMouseDown = (e: React.MouseEvent, fieldKey: string) => {
    if (editing === fieldKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" || target.closest("button") || target.closest("textarea")) return;
    if (e.detail === 2) return;
    e.preventDefault();
    e.stopPropagation();

    const el = elements.find((x) => x.fieldKey === fieldKey)!;
    const rect = canvasRef.current!.getBoundingClientRect();
    setDragging(fieldKey);
    setSelected(fieldKey);
    setDragOffset({
      x: e.clientX - rect.left - mmToPx(el.xMm),
      y: e.clientY - rect.top - mmToPx(el.yMm),
    });
  };

  /* ── 드래그 이동 ── */
  useEffect(() => {
    if (!dragging || !dragOffset || !canvasRef.current) return;
    const handleMove = (e: MouseEvent) => {
      e.preventDefault();
      const rect = canvasRef.current!.getBoundingClientRect();
      const el = elements.find((x) => x.fieldKey === dragging)!;
      const newXMm = Math.max(0, Math.min(pxToMm(e.clientX - rect.left - dragOffset.x), config.labelWidthMm - el.widthMm));
      const newYMm = Math.max(0, Math.min(pxToMm(e.clientY - rect.top - dragOffset.y), config.labelHeightMm - el.heightMm));
      updateEl(dragging, { xMm: newXMm, yMm: newYMm });
    };
    const handleUp = () => { setDragging(null); setDragOffset(null); };
    document.addEventListener("mousemove", handleMove, { passive: false });
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, dragOffset, elements, config, updateEl]);

  /* ── 리사이즈 시작 ── */
  const onResizeStart = (e: React.MouseEvent, fieldKey: string) => {
    e.stopPropagation();
    e.preventDefault();
    const el = elements.find((x) => x.fieldKey === fieldKey)!;
    setResizing(fieldKey);
    setResizeStart({ mx: e.clientX, my: e.clientY, w: el.widthMm, h: el.heightMm });
  };

  /* ── 리사이즈 이동 ── */
  useEffect(() => {
    if (!resizing || !resizeStart) return;
    const handleMove = (e: MouseEvent) => {
      e.preventDefault();
      const dxMm = pxToMm(e.clientX - resizeStart.mx);
      const dyMm = pxToMm(e.clientY - resizeStart.my);
      updateEl(resizing, {
        widthMm: Math.max(5, resizeStart.w + dxMm),
        heightMm: Math.max(2, resizeStart.h + dyMm),
      });
    };
    const handleUp = () => { setResizing(null); setResizeStart(null); };
    document.addEventListener("mousemove", handleMove, { passive: false });
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [resizing, resizeStart, updateEl]);

  /* ── 키보드 이동 ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!selected || editing) return;
      const el = elements.find((x) => x.fieldKey === selected);
      if (!el) return;
      const step = e.shiftKey ? 1 : 0.5;
      if (e.key === "ArrowLeft") { e.preventDefault(); updateEl(selected, { xMm: Math.max(0, el.xMm - step) }); }
      if (e.key === "ArrowRight") { e.preventDefault(); updateEl(selected, { xMm: Math.min(config.labelWidthMm - el.widthMm, el.xMm + step) }); }
      if (e.key === "ArrowUp") { e.preventDefault(); updateEl(selected, { yMm: Math.max(0, el.yMm - step) }); }
      if (e.key === "ArrowDown") { e.preventDefault(); updateEl(selected, { yMm: Math.min(config.labelHeightMm - el.heightMm, el.yMm + step) }); }
      if (e.key === "Escape") { setSelected(null); }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [selected, editing, elements, config, updateEl]);

  /* ── 캔버스 클릭 해제 ── */
  const onCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) { setSelected(null); setEditing(null); }
  };

  const canvasW = mmToPx(config.labelWidthMm);
  const canvasH = mmToPx(config.labelHeightMm);

  return (
    <div className="max-w-5xl mx-auto space-y-4 p-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">바코드 레이아웃 에디터</h1>
          <p className="text-sm text-gray-500 mt-1">
            내부 바코드 라벨 레이아웃을 드래그로 편집합니다. ({config.labelWidthMm}×{config.labelHeightMm}mm)
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            💡 요소 클릭 후 방향키(Shift+방향키=1mm씩)로 이동 · 드래그 이동 · 더블클릭 수정 · 우측 하단 녹색 핸들로 크기 조절
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            기본 양식
          </button>
          <button
            onClick={handleLoad}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
          >
            <Download className="h-4 w-4" />
            저장된 양식
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${saved ? "bg-green-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}
          >
            <Save className="h-4 w-4" />
            {saved ? "저장됨 ✓" : "레이아웃 저장"}
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-start flex-wrap lg:flex-nowrap">
        {/* ── 캔버스 ── */}
        <div className="flex-1 min-w-0">
          <div className="bg-gray-100 rounded-xl p-4 overflow-auto">
            <div
              ref={canvasRef}
              className="relative bg-white border-2 border-gray-400 select-none mx-auto"
              style={{ width: canvasW, height: canvasH }}
              onClick={onCanvasClick}
            >
              {elements.map((el) => {
                if (!el.visible) return null;
                const isSel = selected === el.fieldKey;
                const isEdit = editing === el.fieldKey;
                const isDrag = dragging === el.fieldKey;

                return (
                  <div
                    key={el.fieldKey}
                    className="absolute group"
                    style={{
                      left: mmToPx(el.xMm),
                      top: mmToPx(el.yMm),
                      width: mmToPx(el.widthMm),
                      height: mmToPx(el.heightMm),
                      border: isSel ? "2px solid #3b82f6" : isEdit ? "2px solid #10b981" : "1px dashed transparent",
                      opacity: isDrag ? 0.7 : 1,
                      zIndex: isSel || isEdit || isDrag ? 10 : 1,
                      cursor: isEdit ? "default" : "move",
                    }}
                    onMouseDown={(e) => onMouseDown(e, el.fieldKey)}
                    onClick={(e) => { e.stopPropagation(); setSelected(el.fieldKey); }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (!isDrag) setEditing(el.fieldKey);
                    }}
                    title={`${el.label} — 드래그: 이동, 더블클릭: 수정`}
                  >
                    {/* 삭제 버튼 */}
                    <button
                      className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-red-600 flex items-center justify-center"
                      onClick={(e) => { e.stopPropagation(); updateEl(el.fieldKey, { visible: false }); setSelected(null); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      title="숨기기"
                    >×</button>

                    {/* 리사이즈 핸들 */}
                    {!isEdit && (
                      <div
                        className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-green-500 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-nwse-resize border border-white shadow"
                        onMouseDown={(e) => onResizeStart(e, el.fieldKey)}
                        title="크기 조절"
                      />
                    )}

                    {/* 내용 */}
                    {isEdit ? (
                      <div
                        className="w-full h-full bg-green-50 border-2 border-green-400 rounded p-1 z-30 relative"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="text-[7px] text-green-700 font-bold mb-0.5">수정: {el.label}</p>
                        <textarea
                          value={el.exampleValue}
                          onChange={(ev) => updateEl(el.fieldKey, { exampleValue: ev.target.value })}
                          onKeyDown={(ev) => {
                            ev.stopPropagation();
                            if (ev.key === "Escape" || (ev.key === "Enter" && ev.ctrlKey)) setEditing(null);
                          }}
                          onBlur={() => setTimeout(() => setEditing(null), 200)}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="w-full h-full text-xs border border-green-300 rounded bg-white resize-none focus:outline-none"
                          style={{ fontSize: el.fontSize, minHeight: mmToPx(el.heightMm) - 20 }}
                          autoFocus
                        />
                        <p className="text-[6px] text-gray-400 mt-0.5">Ctrl+Enter / Esc: 닫기</p>
                      </div>
                    ) : el.type === "barcode" ? (
                      <div className="w-full h-full overflow-hidden flex items-center justify-center bg-white">
                        <Barcode
                          value={el.exampleValue}
                          format="CODE128"
                          width={0.9}
                          height={mmToPx(el.heightMm) - 6}
                          displayValue={false}
                          margin={0}
                        />
                      </div>
                    ) : (
                      <div
                        className="w-full h-full flex items-center overflow-hidden px-0.5"
                        style={{
                          fontSize: el.fontSize,
                          fontWeight: el.isBold ? "bold" : "normal",
                          letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : "normal",
                          fontFamily: "monospace",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {el.exampleValue}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 선택된 요소 속성 패널 ── */}
          {selectedEl && !editing && (
            <div className="mt-3 bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">선택된 요소: {selectedEl.label}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">폰트 크기 (px)</label>
                  <input
                    type="number" min={6} max={30}
                    value={selectedEl.fontSize}
                    onChange={(e) => updateEl(selectedEl.fieldKey, { fontSize: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">자간 (px)</label>
                  <input
                    type="number" min={0} max={20}
                    value={selectedEl.letterSpacing}
                    onChange={(e) => updateEl(selectedEl.fieldKey, { letterSpacing: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">너비 (mm)</label>
                  <input
                    type="number" min={3} max={config.labelWidthMm}
                    value={Math.round(selectedEl.widthMm * 10) / 10}
                    onChange={(e) => updateEl(selectedEl.fieldKey, { widthMm: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">높이 (mm)</label>
                  <input
                    type="number" min={2} max={config.labelHeightMm}
                    value={Math.round(selectedEl.heightMm * 10) / 10}
                    onChange={(e) => updateEl(selectedEl.fieldKey, { heightMm: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEl.isBold}
                    onChange={(e) => updateEl(selectedEl.fieldKey, { isBold: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">굵게</span>
                </label>
                <p className="text-xs text-gray-400">위치: ({Math.round(selectedEl.xMm * 10) / 10}mm, {Math.round(selectedEl.yMm * 10) / 10}mm)</p>
              </div>
            </div>
          )}
        </div>

        {/* ── 우측 패널: 라벨 크기 + 요소 목록 ── */}
        <div className="w-64 shrink-0 space-y-4">
          {/* 라벨 크기 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">라벨 크기</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">가로 (mm)</label>
                <input
                  type="number" min={40} max={120}
                  value={config.labelWidthMm}
                  onChange={(e) => setConfig((c) => ({ ...c, labelWidthMm: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">세로 (mm)</label>
                <input
                  type="number" min={20} max={80}
                  value={config.labelHeightMm}
                  onChange={(e) => setConfig((c) => ({ ...c, labelHeightMm: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[{ w: 70, h: 30 }, { w: 62, h: 29 }, { w: 80, h: 40 }, { w: 50, h: 25 }].map(({ w, h }) => (
                <button
                  key={`${w}x${h}`}
                  onClick={() => setConfig((c) => ({ ...c, labelWidthMm: w, labelHeightMm: h }))}
                  className={`px-2 py-1 rounded text-xs border ${config.labelWidthMm === w && config.labelHeightMm === h ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                >
                  {w}×{h}mm
                </button>
              ))}
            </div>
          </div>

          {/* 요소 목록 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <h2 className="font-semibold text-gray-800 text-sm mb-2">요소 목록</h2>
            {elements.map((el) => (
              <button
                key={el.fieldKey}
                onClick={() => { setSelected(el.fieldKey); if (!el.visible) updateEl(el.fieldKey, { visible: true }); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-colors ${selected === el.fieldKey ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"} ${!el.visible ? "opacity-50" : ""}`}
              >
                <span className={`font-medium ${!el.visible ? "text-gray-400 line-through" : "text-gray-700"}`}>
                  {el.label}
                </span>
                <span onClick={(e) => { e.stopPropagation(); updateEl(el.fieldKey, { visible: !el.visible }); }}>
                  {el.visible
                    ? <Eye className="h-4 w-4 text-blue-500" />
                    : <EyeOff className="h-4 w-4 text-gray-400" />}
                </span>
              </button>
            ))}
          </div>

          {/* 안내 */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
            <p className="font-semibold">💡 안내</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>저장 후 인쇄 페이지에 즉시 반영</li>
              <li>바코드 번호 = 수거송장번호-01</li>
              <li>× 버튼: 요소 숨김</li>
              <li>녹색 핸들: 크기 조절</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
