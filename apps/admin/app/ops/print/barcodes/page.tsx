"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Barcode from "react-barcode";
import { Printer, CheckCircle } from "lucide-react";
import { normalizeRepairPart } from "@/lib/barcode";
import {
  loadBarcodeLayout,
  BARCODE_LAYOUT_KEY,
  DEFAULT_CONFIG,
  type BarcodeLayoutConfig,
  type BarcodeLayoutElement,
} from "@/app/ops/barcode-layout/page";

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

const MM_TO_PX_PRINT = 3.7795; // CSS에서 1mm = 3.7795px

export default function PrintBarcodesPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const autoprint = searchParams.get("autoprint") === "1";

  const [barcodes, setBarcodes] = useState<BarcodeRow[]>([]);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printed, setPrinted] = useState(false);
  const [layout, setLayout] = useState<BarcodeLayoutConfig>(DEFAULT_CONFIG);
  const didPrint = useRef(false);

  useEffect(() => {
    setLayout(loadBarcodeLayout());
  }, []);

  useEffect(() => {
    if (!orderId) { setError("orderId가 없습니다."); setLoading(false); return; }
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
      if (!res.ok || !json.success) { setError(json.error || "데이터 로드 실패"); return; }
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
      await fetch(`/api/ops/barcodes?orderId=${encodeURIComponent(orderId)}`, { method: "PATCH" });
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500 text-sm px-4">{error}</div>;
  if (barcodes.length === 0) return <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">바코드가 없습니다. 입고 처리를 먼저 진행해주세요.</div>;

  const inboundDate = orderInfo?.created_at
    ? new Date(orderInfo.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    : "";
  const totalItems = barcodes.length;

  function getBarcodeValue(bc: BarcodeRow): string {
    const tracking = orderInfo?.tracking_no;
    if (tracking) return `${tracking}-${String(bc.seq).padStart(2, "0")}`;
    return bc.barcode_no;
  }

  function getFieldValue(fieldKey: string, bc: BarcodeRow): string {
    const partName = bc.item_name || (orderInfo?.repair_parts ? normalizeRepairPart(orderInfo.repair_parts[bc.seq - 1]) : "");
    const barcodeVal = getBarcodeValue(bc);
    switch (fieldKey) {
      case "barcode": return barcodeVal;
      case "barcode_no": return barcodeVal;
      case "customer_name": return orderInfo?.customer_name ? `${orderInfo.customer_name} (${bc.seq}/${totalItems})` : "";
      case "item_name": return orderInfo?.item_name || "";
      case "repair_part": return partName;
      case "date": return inboundDate ? `입고일 ${inboundDate}` : "";
      default: return "";
    }
  }

  const { labelWidthMm, labelHeightMm, elements } = layout;

  return (
    <>
      {/* 화면 컨트롤 */}
      <div className="print:hidden sticky top-0 z-20 bg-white border-b shadow-sm px-4 py-2 flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-600 font-medium">
          {orderInfo?.order_number} — 바코드 {totalItems}장
          {orderInfo?.tracking_no && (
            <span className="ml-2 text-blue-600 font-mono text-xs">({orderInfo.tracking_no}-XX 형식)</span>
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
        <a href="/ops/barcode-layout" className="ml-auto text-xs text-blue-600 underline">
          레이아웃 설정
        </a>
      </div>

      {/* 라벨 출력 영역 */}
      <div
        id="barcode-print-root"
        className="p-4 print:p-0 flex flex-wrap gap-3 print:gap-0 bg-gray-100 print:bg-white"
      >
        {barcodes.map((bc, idx) => {
          const barcodeVal = getBarcodeValue(bc);
          const labelStyle: React.CSSProperties = {
            width: `${labelWidthMm * MM_TO_PX_PRINT}px`,
            height: `${labelHeightMm * MM_TO_PX_PRINT}px`,
            position: "relative",
            background: "white",
            border: "1px solid #999",
            overflow: "hidden",
            pageBreakAfter: idx < barcodes.length - 1 ? "always" : "auto",
            flexShrink: 0,
          };

          return (
            <div key={bc.id} style={labelStyle}>
              {elements.filter((el) => el.visible).map((el) => {
                const value = getFieldValue(el.fieldKey, bc);
                if (!value) return null;

                const elStyle: React.CSSProperties = {
                  position: "absolute",
                  left: `${el.xMm * MM_TO_PX_PRINT}px`,
                  top: `${el.yMm * MM_TO_PX_PRINT}px`,
                  width: `${el.widthMm * MM_TO_PX_PRINT}px`,
                  height: `${el.heightMm * MM_TO_PX_PRINT}px`,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                };

                if (el.type === "barcode") {
                  return (
                    <div key={el.fieldKey} style={elStyle}>
                      <Barcode
                        value={barcodeVal}
                        format="CODE128"
                        width={1.0}
                        height={el.heightMm * MM_TO_PX_PRINT - 2}
                        displayValue={false}
                        margin={0}
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={el.fieldKey}
                    style={{
                      ...elStyle,
                      fontSize: `${el.fontSize}px`,
                      fontWeight: el.isBold ? "bold" : "normal",
                      letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : "normal",
                      fontFamily: el.fieldKey === "barcode_no" ? "monospace" : "sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {value}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <style>{`
        @media print {
          * { visibility: hidden !important; }
          #barcode-print-root,
          #barcode-print-root * { visibility: visible !important; }
          #barcode-print-root {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            display: flex !important;
            flex-wrap: wrap;
            gap: 0;
            background: white;
            padding: 0;
            margin: 0;
          }
          @page {
            size: ${labelWidthMm}mm ${labelHeightMm}mm;
            margin: 0;
          }
        }
      `}</style>
    </>
  );
}
