
"use client";

import { useState } from "react";
import { Send, Video } from "lucide-react";
import WebcamRecorder from "@/components/ops/WebcamRecorder";

type LookupResult = {
  orderId: string;
  trackingNo?: string;
  status: string;
};

export default function OutboundPage() {
  const [trackingNo, setTrackingNo] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

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
        status: shipment.status,
      };
      setResult(found);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShipped = async () => {
    if (!result) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/ops/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: result.orderId, status: "SHIPPED" }),
      });
      if (res.ok) {
        setResult({ ...result, status: "SHIPPED" });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">출고 (Outbound)</h1>
        <p className="text-sm text-gray-500 mt-1">완성품 출고 및 발송 처리</p>
      </div>

      {/* 스캔 박스 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-sm text-gray-600">송장번호</label>
            <input
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="송장번호를 입력/스캔하세요"
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={isLoading}
            className={`px-4 py-2 rounded text-white ${isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
          >
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
            disabled={!result}
            onClick={() => setShowVideo(true)}
            className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              result ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Video className="h-5 w-5" />
            출고 영상 촬영
          </button>

          <button
            onClick={handleShipped}
            disabled={!result || result.status === "SHIPPED" || isProcessing}
            className={`w-full px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
              result && result.status !== "SHIPPED" && !isProcessing
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Send className="h-5 w-5" />
            {isProcessing ? "처리 중..." : "출고 처리 (SHIPPED)"}
          </button>
        </div>
      </div>

      {/* 출고 영상 다이얼로그 */}
      {showVideo && result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">출고 영상 촬영</h2>
              <button onClick={() => setShowVideo(false)} className="px-3 py-2 bg-gray-200 rounded">
                닫기
              </button>
            </div>
            <div className="p-4">
              <WebcamRecorder
                orderId={result.orderId}
                onUploaded={() => {
                  setShowVideo(false);
                  // 병합 워커는 스토리지 이벤트로 자동 트리거된다고 가정
                  alert("출고 영상이 저장되었습니다. 병합이 곧 진행됩니다.");
                }}
                onClose={() => setShowVideo(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

