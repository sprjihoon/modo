
"use client";

import { useState, useEffect } from "react";
import { CheckCircle, ScanBarcode, Play, Clock, RotateCcw, AlertTriangle, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type LookupResult = {
  orderId: string;
  trackingNo?: string;
  outboundTrackingNo?: string | null;
  status: string;
  repairParts?: string[];
  customerName?: string;
  itemName?: string;
};

type WorkItemStatus = {
  id: string;
  order_id: string;
  item_index: number;
  item_name: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  worker_id?: string;
  worker_name?: string;
  started_at?: string;
  completed_at?: string;
};

export default function WorkPage() {
  const [trackingNo, setTrackingNo] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [workItems, setWorkItems] = useState<WorkItemStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState<{ [key: number]: boolean }>({});
  
  // Extra Charge State
  const [showExtraChargeDialog, setShowExtraChargeDialog] = useState(false);
  const [extraChargeReason, setExtraChargeReason] = useState("");
  const [isSubmittingExtraCharge, setIsSubmittingExtraCharge] = useState(false);

  // 작업 아이템 상태 조회
  const loadWorkItems = async (orderId: string) => {
    try {
      const res = await fetch(`/api/ops/work-items?orderId=${encodeURIComponent(orderId)}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setWorkItems(json.data || []);
      }
    } catch (error) {
      console.error("작업 아이템 상태 조회 실패:", error);
    }
  };

  const handleLookup = async () => {
    if (!trackingNo.trim()) return;
    setIsLoading(true);
    setResult(null);
    setWorkItems([]);
    try {
      const res = await fetch(`/api/ops/shipments/${encodeURIComponent(trackingNo.trim())}`);
      const json = await res.json();
      if (!res.ok || !json?.data) {
        setResult(null);
        return;
      }
      const { shipment, order } = json.data;
      
      // repair_parts 추출
      const repairParts = Array.isArray(order.repair_parts) 
        ? order.repair_parts 
        : (order.repair_parts ? [order.repair_parts] : []);

      const found: LookupResult = {
        orderId: shipment.order_id,
        trackingNo: shipment.tracking_no,
        outboundTrackingNo: shipment.outbound_tracking_no,
        status: shipment.status || order.status,
        repairParts: repairParts.length > 0 ? repairParts : (order.item_name ? [order.item_name] : []),
        customerName: order.customer_name,
        itemName: order.item_name,
      };
      setResult(found);

      // 작업 아이템 상태 조회
      await loadWorkItems(found.orderId);
    } finally {
      setIsLoading(false);
    }
  };

  // 작업 시작
  const handleStartWork = async (itemIndex: number, itemName: string) => {
    if (!result) return;
    
    setIsProcessing((prev) => ({ ...prev, [itemIndex]: true }));
    try {
      const res = await fetch("/api/ops/work-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: result.orderId,
          itemIndex,
          itemName,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "작업 시작 실패");
        return;
      }

      // 작업 아이템 상태 새로고침
      await loadWorkItems(result.orderId);
    } catch (error) {
      console.error("작업 시작 실패:", error);
      alert("작업 시작 실패");
    } finally {
      setIsProcessing((prev) => ({ ...prev, [itemIndex]: false }));
    }
  };

  // 작업 완료
  const handleCompleteWork = async (itemIndex: number) => {
    if (!result) return;
    
    setIsProcessing((prev) => ({ ...prev, [itemIndex]: true }));
    try {
      const res = await fetch("/api/ops/work-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: result.orderId,
          itemIndex,
          action: "complete",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "작업 완료 실패");
        return;
      }

      // 작업 아이템 상태 새로고침
      await loadWorkItems(result.orderId);
    } catch (error) {
      console.error("작업 완료 실패:", error);
      alert("작업 완료 실패");
    } finally {
      setIsProcessing((prev) => ({ ...prev, [itemIndex]: false }));
    }
  };

  // 작업 시작 전으로 되돌리기
  const handleReopenWork = async (itemIndex: number) => {
    if (!result) return;
    
    if (!confirm("정말 작업 시작 전 상태로 되돌리시겠습니까?")) {
      return;
    }
    
    setIsProcessing((prev) => ({ ...prev, [itemIndex]: true }));
    try {
      const res = await fetch("/api/ops/work-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: result.orderId,
          itemIndex,
          action: "reopen",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "작업 상태 되돌리기 실패");
        return;
      }

      // 작업 아이템 상태 새로고침
      await loadWorkItems(result.orderId);
    } catch (error) {
      console.error("작업 상태 되돌리기 실패:", error);
      alert("작업 상태 되돌리기 실패");
    } finally {
      setIsProcessing((prev) => ({ ...prev, [itemIndex]: false }));
    }
  };

  // 아이템의 작업 상태 가져오기
  const getWorkItemStatus = (itemIndex: number): WorkItemStatus | null => {
    return workItems.find((item) => item.item_index === itemIndex) || null;
  };

  // 모든 아이템이 완료되었는지 확인
  const allItemsCompleted = result && result.repairParts && result.repairParts.length > 0
    ? result.repairParts.every((_, index) => {
        const status = getWorkItemStatus(index);
        return status?.status === "COMPLETED";
      })
    : false;

  // 추가 비용 요청
  const handleRequestExtraCharge = async () => {
    if (!result || !extraChargeReason.trim()) return;

    setIsSubmittingExtraCharge(true);
    try {
      const res = await fetch("/api/ops/extra-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: result.orderId,
          reason: extraChargeReason,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "추가 비용 요청 실패");
      }

      alert("✅ 추가 비용 요청이 접수되었습니다. 관리자가 검토 후 고객에게 안내합니다.");
      setShowExtraChargeDialog(false);
      setExtraChargeReason("");
    } catch (error: any) {
      console.error("추가 비용 요청 실패:", error);
      alert(`요청 실패: ${error.message}`);
    } finally {
      setIsSubmittingExtraCharge(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">작업 (Work)</h1>
          <p className="text-sm text-gray-500 mt-1">수선 작업 진행 관리</p>
        </div>
        {result && (
          <Button 
            variant="outline" 
            className="text-orange-600 border-orange-200 hover:bg-orange-50"
            onClick={() => setShowExtraChargeDialog(true)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            추가 비용 요청
          </Button>
        )}
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
            className={`px-4 py-2 rounded text-white flex items-center gap-2 ${
              isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <ScanBarcode className="h-4 w-4" />
            조회
          </button>
        </div>
        {result && (
          <div className="mt-4 text-sm text-gray-700 space-y-1">
            <div><strong>주문 ID:</strong> {result.orderId}</div>
            <div><strong>고객명:</strong> {result.customerName || "없음"}</div>
            <div><strong>상품명:</strong> {result.itemName || "없음"}</div>
            <div><strong>현재 상태:</strong> {result.status}</div>
            {result.repairParts && result.repairParts.length > 0 && (
              <div>
                <strong>수선 부위:</strong> {result.repairParts.join(", ")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 아이템별 작업 관리 */}
      {result && result.repairParts && result.repairParts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            작업 아이템 관리 ({result.repairParts.length}개)
          </h2>
          
          <div className="space-y-4">
            {result.repairParts.map((itemName, index) => {
              const workItem = getWorkItemStatus(index);
              const isInProgress = workItem?.status === "IN_PROGRESS";
              const isCompleted = workItem?.status === "COMPLETED";
              const isPending = !workItem || workItem.status === "PENDING";
              const isProcessingItem = isProcessing[index] || false;

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    isCompleted
                      ? "bg-green-50 border-green-200"
                      : isInProgress
                      ? "bg-blue-50 border-blue-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {index + 1}번. {itemName}
                        </span>
                        {isCompleted && (
                          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                            완료
                          </span>
                        )}
                        {isInProgress && (
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            작업 중
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2 py-1 bg-gray-400 text-white text-xs rounded">
                            대기
                          </span>
                        )}
                      </div>
                      {workItem && workItem.worker_name && (
                        <div className="text-xs text-gray-600">
                          작업자: {workItem.worker_name}
                        </div>
                      )}
                      {workItem && workItem.started_at && (
                        <div className="text-xs text-gray-600">
                          시작: {new Date(workItem.started_at).toLocaleString("ko-KR")}
                        </div>
                      )}
                      {workItem && workItem.completed_at && (
                        <div className="text-xs text-gray-600">
                          완료: {new Date(workItem.completed_at).toLocaleString("ko-KR")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {/* 작업 시작 버튼 */}
                    <button
                      onClick={() => handleStartWork(index, itemName)}
                      disabled={isInProgress || isCompleted || isProcessingItem}
                      className={`px-4 py-2 rounded text-white flex items-center gap-2 text-sm ${
                        isInProgress || isCompleted || isProcessingItem
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      <Play className="h-4 w-4" />
                      {isProcessingItem ? "처리 중..." : "작업 시작"}
                    </button>

                    {/* 작업 완료 버튼 */}
                    <button
                      onClick={() => handleCompleteWork(index)}
                      disabled={!isInProgress || isCompleted || isProcessingItem}
                      className={`px-4 py-2 rounded text-white flex items-center gap-2 text-sm ${
                        !isInProgress || isCompleted || isProcessingItem
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {isProcessingItem ? "처리 중..." : "작업 완료"}
                    </button>

                    {/* 작업 시작 전으로 되돌리기 버튼 */}
                    {isCompleted && (
                      <button
                        onClick={() => handleReopenWork(index)}
                        disabled={isProcessingItem}
                        className={`px-4 py-2 rounded text-white flex items-center gap-2 text-sm ${
                          isProcessingItem
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-orange-600 hover:bg-orange-700"
                        }`}
                      >
                        <RotateCcw className="h-4 w-4" />
                        {isProcessingItem ? "처리 중..." : "되돌리기"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 전체 완료 안내 */}
          {allItemsCompleted && (
            <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg">
              <p className="text-sm text-green-800 font-medium">
                ✅ 모든 아이템의 작업이 완료되었습니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 추가 비용 요청 다이얼로그 */}
      <Dialog open={showExtraChargeDialog} onOpenChange={setShowExtraChargeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>추가 비용 요청</DialogTitle>
            <DialogDescription>
              작업 중 추가 비용이 발생하는 사유를 입력해주세요.<br/>
              금액은 관리자가 검토 후 결정하여 고객에게 청구합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason" className="mb-2 block">요청 사유</Label>
            <Textarea
              id="reason"
              placeholder="예: 안감 교체 필요, 특수 소재로 인한 추가 공임 등"
              value={extraChargeReason}
              onChange={(e) => setExtraChargeReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtraChargeDialog(false)} disabled={isSubmittingExtraCharge}>
              취소
            </Button>
            <Button 
              onClick={handleRequestExtraCharge} 
              disabled={!extraChargeReason.trim() || isSubmittingExtraCharge}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isSubmittingExtraCharge ? "요청 중..." : "요청 보내기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

