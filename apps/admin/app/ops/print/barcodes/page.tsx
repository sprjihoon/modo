"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Barcode from "react-barcode";
import { Printer, CheckCircle, Settings, X, Eye, EyeOff } from "lucide-react";
import { normalizeRepairPart } from "@/lib/barcode";

interface BarcodeRow {
  id: string;
  order_id: string;
  barcode_no: string;
  seq: number;
  item_name: string | null;
  printed_at: string | null;
}

interface OrderInfo {
  order_number: string;
  customer_name: string;
  item_name: string;
  repair_parts: unknown[];
  created_at: string;
  tracking_no?: string | null;
}

interface LabelLayout {
  showCustomerName: boolean;
  showItemName: boolean;
  showRepairPart: boolean;
  showDate: boolean;
  showSeq: boolean;
  barcodeHeight: number;   // px (화면 기준, 인쇄 시 비례)
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

const FONT_SIZE_MAP = {
  xs: { main: "9px", sub: "8px", code: "8px" },
  sm: { main: "10px", sub: "9px", code: "9px" },
  md: { main: "11px", sub: "10px", code: "10px" },
};

function loadLayout(): LabelLayout {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const saved = localStorage.getItem("barcode-label-layout");
    if (saved) return { ...DEFAULT_LAYOUT, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_LAYOUT;
}

function saveLayout(layout: LabelLayout) {
  try {
    localStorage.setItem("barcode-label-layout", JSON.stringify(layout));
  } catch {}
}

export default function PrintBarcodesPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const autoprint = searchParams.get("autoprint") === "1";

  const [barcodes, setBarcodes] = useState<BarcodeRow[]>([]);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printed, setPrinted] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [layout, setLayout] = useState<LabelLayout>(DEFAULT_LAYOUT);
  const didPrint = useRef(false);

  useEffect(() => {
    setLayout(loadLayout());
  }, []);

  useEffect(() => {
    if (!orderId) {
      setError("orderId가 없습니다.");
      setLoading(false);
      return;
    }
    loadData(orderId);
  }, [orderId]);

  useEffect(() => {
    if (autoprint && barcodes.length > 0 && !didPrint.current) {
      didPrint.current = true;
      setTimeout(() => handlePrint(), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoprint, barcodes]);

  async function loadData(id: string) {
    try {
      const res = await fetch(`/api/ops/barcodes?orderId=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "데이터 로드 실패");
        return;
      }
      setBarcodes(json.barcodes ?? []);
      setOrderInfo(json.order ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }

  async function handlePrint() {
    window.print();
    setPrinted(true);
    if (orderId) {
      await fetch(`/api/ops/barcodes?orderId=${encodeURIComponent(orderId)}`, {
        method: "PATCH",
      });
    }
  }

  const updateLayout = useCallback((patch: Partial<LabelLayout>) => {
    setLayout((prev) => {
      const next = { ...prev, ...patch };
      saveLayout(next);
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500 text-sm px-4">
        {error}
      </div>
    );
  }
  if (barcodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-gray-500">
        <p>바코드가 없습니다. 입고 처리를 먼저 진행해주세요.</p>
      </div>
    );
  }

  const inboundDate = orderInfo?.created_at
    ? new Date(orderInfo.created_at).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "";

  const totalItems = barcodes.length;
  const fonts = FONT_SIZE_MAP[layout.fontSize];

  // 바코드 값: tracking_no 있으면 "{tracking_no}-01" 형식, 없으면 기존 barcode_no
  function getBarcodeValue(bc: BarcodeRow): string {
    const tracking = orderInfo?.tracking_no;
    if (tracking) {
      return `${tracking}-${String(bc.seq).padStart(2, "0")}`;
    }
    return bc.barcode_no;
  }

  const labelStylePx = {
    width: `${layout.labelWidthMm * 3.7795}px`,
    height: `${layout.labelHeightMm * 3.7795}px`,
  };

  return (
    <>
      {/* ── 화면 전용 컨트롤 바 ── */}
      <div className="print:hidden sticky top-0 z-20 bg-white border-b shadow-sm px-4 py-2 flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-600 font-medium">
          {orderInfo?.order_number} — 바코드 {totalItems}장
          {orderInfo?.tracking_no && (
            <span className="ml-2 text-blue-600 font-mono text-xs">
              ({orderInfo.tracking_no}-XX 형식)
            </span>
          )}
        </span>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Printer className="h-4 w-4" />
          인쇄
        </button>
        {printed && (
          <span className="flex items-center gap-1 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            출력 완료 (기록됨)
          </span>
        )}
        <button
          onClick={() => setShowEditor((v) => !v)}
          className="ml-auto flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
        >
          <Settings className="h-4 w-4" />
          레이아웃 설정
        </button>
      </div>

      <div className="print:block flex gap-4">
        {/* ── 레이아웃 에디터 패널 ── */}
        {showEditor && (
          <div className="print:hidden w-72 shrink-0 bg-white border-r border-gray-200 p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-56px)]">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">바코드 레이아웃 설정</h2>
              <button onClick={() => setShowEditor(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 라벨 크기 */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">라벨 크기</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600">가로 (mm)</label>
                  <input
                    type="number"
                    min={40} max={120}
                    value={layout.labelWidthMm}
                    onChange={(e) => updateLayout({ labelWidthMm: Number(e.target.value) })}
                    className="w-full mt-0.5 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">세로 (mm)</label>
                  <input
                    type="number"
                    min={20} max={80}
                    value={layout.labelHeightMm}
                    onChange={(e) => updateLayout({ labelHeightMm: Number(e.target.value) })}
                    className="w-full mt-0.5 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[{ w: 70, h: 30 }, { w: 62, h: 29 }, { w: 80, h: 40 }, { w: 50, h: 25 }].map(({ w, h }) => (
                  <button
                    key={`${w}x${h}`}
                    onClick={() => updateLayout({ labelWidthMm: w, labelHeightMm: h })}
                    className={`px-2 py-1 rounded text-xs border ${
                      layout.labelWidthMm === w && layout.labelHeightMm === h
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {w}×{h}mm
                  </button>
                ))}
              </div>
            </div>

            {/* 바코드 높이 */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">바코드 높이</p>
              <input
                type="range"
                min={20} max={70} step={2}
                value={layout.barcodeHeight}
                onChange={(e) => updateLayout({ barcodeHeight: Number(e.target.value) })}
                className="w-full"
              />
              <p className="text-xs text-gray-500 text-right">{layout.barcodeHeight}px</p>
            </div>

            {/* 글자 크기 */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">글자 크기</p>
              <div className="flex gap-2">
                {(["xs", "sm", "md"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateLayout({ fontSize: s })}
                    className={`flex-1 py-1.5 rounded text-sm border ${
                      layout.fontSize === s
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {s === "xs" ? "소" : s === "sm" ? "중" : "대"}
                  </button>
                ))}
              </div>
            </div>

            {/* 표시 항목 */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">표시 항목</p>
              {(
                [
                  { key: "showCustomerName", label: "고객명" },
                  { key: "showItemName", label: "수선 항목" },
                  { key: "showRepairPart", label: "수선 부위" },
                  { key: "showDate", label: "입고일" },
                  { key: "showSeq", label: "순번 표시" },
                ] as { key: keyof LabelLayout; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => updateLayout({ [key]: !layout[key] })}
                  className="w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                >
                  <span className="text-gray-700">{label}</span>
                  {layout[key] ? (
                    <Eye className="h-4 w-4 text-blue-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              ))}
            </div>

            {/* 초기화 */}
            <button
              onClick={() => {
                setLayout(DEFAULT_LAYOUT);
                saveLayout(DEFAULT_LAYOUT);
              }}
              className="w-full py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              기본값으로 초기화
            </button>
          </div>
        )}

        {/* ── 라벨 미리보기 / 인쇄 영역 ── */}
        <div
          id="barcode-print-root"
          className="flex-1 p-4 print:p-0 flex flex-wrap gap-3 print:gap-0 bg-gray-100 print:bg-white"
        >
          {barcodes.map((bc, idx) => {
            const partName =
              bc.item_name ||
              (orderInfo?.repair_parts
                ? normalizeRepairPart(orderInfo.repair_parts[bc.seq - 1])
                : "");
            const barcodeValue = getBarcodeValue(bc);

            return (
              <div
                key={bc.id}
                className="bg-white border border-gray-400 print:border-gray-600 flex flex-col items-center justify-center overflow-hidden print:page-break-after-always"
                style={{
                  ...labelStylePx,
                  padding: "2mm",
                  boxSizing: "border-box",
                  pageBreakAfter: idx < barcodes.length - 1 ? "always" : "auto",
                }}
              >
                {/* 바코드 */}
                <div className="flex-shrink-0">
                  <Barcode
                    value={barcodeValue}
                    format="CODE128"
                    width={1.2}
                    height={layout.barcodeHeight}
                    displayValue={false}
                    margin={0}
                  />
                </div>

                {/* 바코드 번호 텍스트 */}
                <p
                  className="font-mono tracking-tight text-gray-800 leading-tight"
                  style={{ fontSize: fonts.code }}
                >
                  {barcodeValue}
                </p>

                {/* 고객명 */}
                {layout.showCustomerName && orderInfo?.customer_name && (
                  <p
                    className="font-bold text-gray-900 leading-tight"
                    style={{ fontSize: fonts.main }}
                  >
                    {orderInfo.customer_name}
                    {layout.showSeq && (
                      <span className="font-normal text-gray-500 ml-1">
                        ({bc.seq}/{totalItems})
                      </span>
                    )}
                  </p>
                )}

                {/* 수선 항목 */}
                {layout.showItemName && orderInfo?.item_name && (
                  <p
                    className="text-gray-700 leading-tight text-center"
                    style={{ fontSize: fonts.sub }}
                  >
                    {orderInfo.item_name}
                  </p>
                )}

                {/* 수선 부위 */}
                {layout.showRepairPart && partName && (
                  <p
                    className="text-blue-700 font-medium leading-tight text-center"
                    style={{ fontSize: fonts.sub }}
                  >
                    {partName}
                  </p>
                )}

                {/* 입고일 */}
                {layout.showDate && inboundDate && (
                  <p
                    className="text-gray-400 leading-tight"
                    style={{ fontSize: fonts.sub }}
                  >
                    입고일 {inboundDate}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media print {
          /* 사이드바, 헤더 등 레이아웃 전체 숨기기 */
          * { visibility: hidden !important; }
          #barcode-print-root,
          #barcode-print-root * { visibility: visible !important; }
          #barcode-print-root {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex !important;
            flex-wrap: wrap;
            gap: 0;
            background: white;
            padding: 0;
            margin: 0;
          }
          @page {
            size: ${layout.labelWidthMm}mm ${layout.labelHeightMm}mm;
            margin: 0;
          }
        }
      `}</style>
    </>
  );
}
