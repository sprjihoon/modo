
"use client";

import { useState } from "react";
import { CheckCircle, ScanBarcode } from "lucide-react";

type LookupResult = {
  orderId: string;
  trackingNo?: string;
  outboundTrackingNo?: string | null;
  status: string;
};

export default function WorkPage() {
  const [trackingNo, setTrackingNo] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLookup = async () => {
    if (!trackingNo.trim()) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/ops/shipments/${encodeURIComponent(trackingNo.trim())}`);
      const json = await res.json();
      if (!res.ok || !json?.data) {
        setResult(null);
        return;
      }
      const { shipment } = json.data;
      const found: LookupResult = {
        orderId: shipment.order_id,
        trackingNo: shipment.tracking_no,
        outboundTrackingNo: shipment.outbound_tracking_no,
        status: shipment.status,
      };
      setResult(found);

      // 스캔 즉시 PROCESSING 진입
      setIsProcessing(true);
      const res2 = await fetch("/api/ops/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: found.orderId, status: "PROCESSING" }),
      });
      if (res2.ok) {
        setResult((prev) => (prev ? { ...prev, status: "PROCESSING" } : prev));
      }
    } finally {
      setIsProcessing(false);
      setIsLoading(false);
    }
  };

  const handleCompleteWork = async () => {
    if (!result) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/ops/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: result.orderId, status: "READY_TO_SHIP" }),
      });
      if (res.ok) {
        setResult({ ...result, status: "READY_TO_SHIP" });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">작업 (Work)</h1>
        <p className="text-sm text-gray-500 mt-1">수선 작업 진행 관리</p>
      </div>

      {/* 스캔 박스 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-sm text-gray-600">출고 송장번호</label>
            <input
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="출고 송장번호를 입력/스캔하세요"
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={isLoading}
            className={`px-4 py-2 rounded text-white flex items-center gap-2 ${
              isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <ScanBarcode className="h-4 w-4" />
            조회
          </button>
        </div>
        {result && (
          <div className="mt-4 text-sm text-gray-700">
            <div>Order: {result.orderId}</div>
            <div>현재 상태: {result.status}</div>
          </div>
        )}
      </div>

      {/* 액션 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-3">
          <button
            onClick={handleCompleteWork}
            disabled={!result || result.status === "READY_TO_SHIP" || isProcessing}
            className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              result && result.status !== "READY_TO_SHIP" && !isProcessing
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <CheckCircle className="h-5 w-5" />
            {isProcessing ? "처리 중..." : "작업 완료 (READY_TO_SHIP)"}
          </button>
        </div>
      </div>
    </div>
  );
}

