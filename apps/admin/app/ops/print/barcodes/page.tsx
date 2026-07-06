"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Barcode from "react-barcode";
import { Printer, CheckCircle } from "lucide-react";
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
  const didPrint = useRef(false);

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
    } catch (e: any) {
      setError(e.message || "데이터 로드 실패");
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

  return (
    <>
      {/* 화면용 컨트롤 */}
      <div className="print:hidden p-4 bg-white border-b flex items-center gap-3 sticky top-0 z-10">
        <span className="text-sm text-gray-600 font-medium">
          {orderInfo?.order_number} — 바코드 {totalItems}장
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
      </div>

      {/* 라벨 영역 */}
      <div className="p-4 flex flex-wrap gap-3 print:gap-0 print:p-0">
        {barcodes.map((bc) => {
          const partName =
            bc.item_name ||
            (orderInfo?.repair_parts
              ? normalizeRepairPart(orderInfo.repair_parts[bc.seq - 1])
              : "");
          return (
            <div
              key={bc.id}
              className="
                border border-gray-300 rounded-md p-3 w-[200px]
                flex flex-col items-center gap-1 bg-white
                print:border print:border-gray-400 print:rounded-none
                print:w-[200px] print:page-break-inside-avoid
              "
            >
              <Barcode
                value={bc.barcode_no}
                format="CODE128"
                width={1.5}
                height={50}
                displayValue={false}
                margin={0}
              />
              <p className="text-[10px] font-mono tracking-tight text-gray-700 mt-0.5">
                {bc.barcode_no}
              </p>
              <p className="text-[11px] font-semibold text-gray-900 text-center">
                {orderInfo?.customer_name}
              </p>
              <p className="text-[10px] text-gray-600 text-center">
                {orderInfo?.item_name}{" "}
                <span className="text-gray-400">
                  ({bc.seq}/{totalItems})
                </span>
              </p>
              {partName && (
                <p className="text-[10px] text-blue-700 font-medium text-center">
                  {partName}
                </p>
              )}
              <p className="text-[9px] text-gray-400 mt-0.5">입고일 {inboundDate}</p>
            </div>
          );
        })}
      </div>

      <style>{`
        @media print {
          @page { margin: 8mm; size: A4; }
          body { background: white; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  );
}
