"use client";

import { useState, useRef } from "react";
import { ScanBarcode, Printer, Tag, FileText, RotateCcw } from "lucide-react";
import {
  WorkOrderSheet,
  type WorkOrderData,
  type WorkOrderImage,
} from "@/components/ops/work-order-sheet";
import { ShippingLabelSheet, type ShippingLabelData } from "@/components/ops/shipping-label-sheet";
import { normalizeRepairPart } from "@/lib/barcode";

type LookupResult = {
  orderId: string;
  orderNumber?: string;
  trackingNo?: string;
  outboundTrackingNo?: string | null;
  status: string;
  customerName?: string;
  customerPhone?: string;
  itemName?: string;
  summary?: string;
  repairParts?: string[];
  images?: WorkOrderImage[];
  shippingLabel?: ShippingLabelData | null;
  scannedItemSeq?: number | null;
};

type ShowMode = "none" | "workorder" | "barcode";

export default function ReprintPage() {
  const [scanValue, setScanValue] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState<ShowMode>("none");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleLookup() {
    const q = scanValue.trim();
    if (!q) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setShow("none");

    try {
      const res = await fetch(`/api/ops/shipments/${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok || !json?.data) {
        setError(json?.error || "찾을 수 없습니다.");
        return;
      }

      const { shipment, order, scannedItemSeq } = json.data;

      const rawParts = Array.isArray(order.repair_parts) ? (order.repair_parts as unknown[]) : [];
      const repairParts = rawParts.map(normalizeRepairPart).filter(Boolean);

      let images: WorkOrderImage[] = [];
      if (Array.isArray(order.images_with_pins)) {
        images = order.images_with_pins.map((img: any) => ({
          url: img?.imagePath || img?.url || "",
          pins: Array.isArray(img?.pins)
            ? img.pins.map((p: any) => ({ x: p.x ?? 0, y: p.y ?? 0, memo: p.memo ?? "" }))
            : [],
        }));
      }

      // 송장 라벨 데이터 구성
      let shippingLabel: ShippingLabelData | null = null;
      const deliveryTn = shipment.delivery_tracking_no || null;
      if (deliveryTn) {
        let di: any = shipment.delivery_info;
        if (typeof di === "string") { try { di = JSON.parse(di); } catch { di = null; } }
        shippingLabel = {
          trackingNo: deliveryTn,
          orderDate: order.created_at ? new Date(order.created_at).toLocaleDateString("ko-KR") : "",
          recipientName: order.customer_name || "",
          sellerName: "모두의수선",
          orderNumber: order.order_number || shipment.order_id || "",
          senderAddress: di?.senderAddr || "서울시 강남구 테헤란로 123",
          senderName: "모두의수선",
          senderPhone: di?.senderTel || "02-0000-0000",
          recipientZipcode: order.delivery_zipcode || "",
          recipientAddress: [order.delivery_address, order.delivery_address_detail].filter(Boolean).join(" "),
          recipientPhone: order.customer_phone || "",
          totalQuantity: 1,
          itemsList: order.item_name || "의류",
          printAreaCd: di?.printAreaCd || "",
        };
      }

      setResult({
        orderId: shipment.order_id,
        orderNumber: order.order_number,
        trackingNo: shipment.pickup_tracking_no || shipment.tracking_no,
        outboundTrackingNo: deliveryTn,
        status: shipment.status || order.status,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        itemName: order.item_name,
        summary: order.repair_summary || repairParts.join(", "),
        repairParts,
        images,
        shippingLabel,
        scannedItemSeq: scannedItemSeq ?? null,
      });
    } catch (e: any) {
      setError(e.message || "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
      setScanValue("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function buildWorkOrderData(): WorkOrderData {
    if (!result) throw new Error();
    return {
      trackingNo: result.trackingNo || "",
      outboundTrackingNo: result.outboundTrackingNo ?? undefined,
      customerName: result.customerName || "고객명 없음",
      customerPhone: result.customerPhone,
      itemName: result.itemName || "",
      summary: result.summary || "",
      repairParts: result.repairParts ?? [],
      images: result.images ?? [],
    };
  }

  const statusLabel: Record<string, string> = {
    BOOKED: "예약",
    INBOUND: "입고",
    IN_PROGRESS: "작업중",
    DONE: "완료",
    OUTBOUND: "출고",
    DELIVERED: "배송완료",
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">서류 재출력</h1>
        <p className="text-sm text-gray-500 mt-1">
          송장번호 또는 내부 바코드로 조회 후 작업지시서·송장·바코드를 재출력합니다.
        </p>
      </div>

      {/* 스캔 인풋 */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-5">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700">
              송장번호 / 내부 바코드 / 주문번호
            </label>
            <input
              ref={inputRef}
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="스캔 또는 직접 입력..."
              className="mt-1.5 w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-lg text-white flex items-center gap-2 text-sm font-medium ${
              isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <ScanBarcode className="h-4 w-4" />
            {isLoading ? "조회 중..." : "조회"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      {/* 조회 결과 */}
      {result && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {result.customerName}{" "}
                  <span className="text-sm text-gray-500 font-normal">· {result.itemName}</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  주문번호: {result.orderNumber || result.orderId}
                </p>
              </div>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-medium">
                {statusLabel[result.status] || result.status}
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1 mb-4">
              <div>입고 송장: <span className="font-mono">{result.trackingNo || "없음"}</span></div>
              <div>출고 송장: <span className="font-mono">{result.outboundTrackingNo || "없음"}</span></div>
              {result.repairParts && result.repairParts.length > 0 && (
                <div>수선항목: {result.repairParts.join(" / ")}</div>
              )}
            </div>

            {/* 재출력 버튼들 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setShow("workorder")}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-50 text-sm font-medium"
              >
                <FileText className="h-4 w-4" />
                작업지시서 재출력
              </button>
              <button
                onClick={() => {
                  if (!result.outboundTrackingNo) {
                    alert("출고 송장번호가 없습니다.");
                    return;
                  }
                  setShow("none");
                  setTimeout(() => window.print(), 200);
                }}
                disabled={!result.outboundTrackingNo}
                className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-lg text-sm font-medium ${
                  result.outboundTrackingNo
                    ? "border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                    : "border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Printer className="h-4 w-4" />
                출고 송장 재출력
              </button>
              <button
                onClick={() => {
                  window.open(
                    `/ops/print/barcodes?orderId=${result.orderId}&autoprint=1`,
                    "_blank",
                  );
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-orange-300 rounded-lg text-orange-700 hover:bg-orange-50 text-sm font-medium"
              >
                <Tag className="h-4 w-4" />
                내부 바코드 재출력
              </button>
            </div>
          </div>

          {/* 작업지시서 미리보기 */}
          {show === "workorder" && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto print:max-w-none print:max-h-none print:shadow-none print:rounded-none print:overflow-visible">
                <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center print:hidden">
                  <h2 className="text-lg font-semibold">작업지시서 재출력</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      인쇄
                    </button>
                    <button
                      onClick={() => setShow("none")}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                    >
                      닫기
                    </button>
                  </div>
                </div>
                <div className="p-4 print:p-0">
                  <WorkOrderSheet
                    data={buildWorkOrderData()}
                    highlightedPartIndex={
                      result.scannedItemSeq != null ? result.scannedItemSeq - 1 : undefined
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* 출고 송장 인쇄 미리보기 — print 전용 */}
          {result.shippingLabel && (
            <div className="hidden print:block">
              <ShippingLabelSheet data={result.shippingLabel} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
