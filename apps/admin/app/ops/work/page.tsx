
"use client";

import { useState, useEffect, useRef } from "react";
import {
  CheckCircle,
  ScanBarcode,
  Play,
  Clock,
  RotateCcw,
  AlertTriangle,
  Printer,
} from "lucide-react";
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
import {
  WorkOrderSheet,
  type WorkOrderData,
  type WorkOrderImage,
} from "@/components/ops/work-order-sheet";
import { normalizeRepairPart } from "@/lib/barcode";

type LookupResult = {
  orderId: string;
  trackingNo?: string;
  outboundTrackingNo?: string | null;
  status: string;
  repairParts?: string[];
  customerName?: string;
  customerPhone?: string;
  itemName?: string;
  summary?: string;
  images?: WorkOrderImage[];
  scannedItemSeq?: number | null;
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

function buildWorkOrderData(result: LookupResult): WorkOrderData {
  return {
    trackingNo: result.trackingNo || "",
    outboundTrackingNo: result.outboundTrackingNo ?? undefined,
    customerName: result.customerName || "고객명 없음",
    customerPhone: result.customerPhone,
    itemName: result.itemName || "",
    summary: result.summary || result.repairParts?.join(", ") || "",
    repairParts: result.repairParts ?? [],
    images: result.images ?? [],
  };
}

export default function WorkPage() {
  const [trackingNo, setTrackingNo] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [workItems, setWorkItems] = useState<WorkItemStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState<{ [key: number]: boolean }>({});
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extra Charge
  const [showExtraChargeDialog, setShowExtraChargeDialog] = useState(false);
  const [extraChargeReason, setExtraChargeReason] = useState("");
  const [extraChargeAmount, setExtraChargeAmount] = useState("");
  const [extraChargeNote, setExtraChargeNote] = useState("");
  const [isSubmittingExtraCharge, setIsSubmittingExtraCharge] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const r = await fetch("/api/auth/me");
        const d = await r.json();
        if (d.success && d.user) setUserRole(d.user.role);
      } catch {}
    };
    loadUserRole();
    inputRef.current?.focus();
  }, []);

  const loadWorkItems = async (orderId: string) => {
    try {
      const res = await fetch(`/api/ops/work-items?orderId=${encodeURIComponent(orderId)}`);
      const json = await res.json();
      if (res.ok && json.success) setWorkItems(json.data || []);
    } catch {}
  };

  const handleLookup = async () => {
    if (!trackingNo.trim()) return;
    setIsLoading(true);
    setResult(null);
    setWorkItems([]);
    try {
      const res = await fetch(`/api/ops/shipments/${encodeURIComponent(trackingNo.trim())}`);
      const json = await res.json();
      if (!res.ok || !json?.data) return;

      const { shipment, order, scannedItemSeq } = json.data;

      const rawParts = Array.isArray(order.repair_parts) ? (order.repair_parts as unknown[]) : [];
      const repairParts = rawParts.map(normalizeRepairPart).filter(Boolean);

      // images_with_pins → WorkOrderImage[]
      let images: WorkOrderImage[] = [];
      if (Array.isArray(order.images_with_pins)) {
        images = order.images_with_pins.map((img: any) => ({
          url: img?.imagePath || img?.url || "",
          pins: Array.isArray(img?.pins)
            ? img.pins.map((p: any) => ({ x: p.x ?? 0, y: p.y ?? 0, memo: p.memo ?? "" }))
            : [],
        }));
      } else if (Array.isArray(order.images?.urls)) {
        images = order.images.urls.map((url: string) => ({ url, pins: [] }));
      }

      const found: LookupResult = {
        orderId: shipment.order_id,
        trackingNo: shipment.pickup_tracking_no || shipment.tracking_no,
        outboundTrackingNo: shipment.delivery_tracking_no || shipment.tracking_no,
        status: shipment.status || order.status,
        repairParts: repairParts.length > 0 ? repairParts : order.item_name ? [order.item_name] : [],
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        itemName: order.item_name,
        summary: order.repair_summary || repairParts.join(", "),
        images,
        scannedItemSeq: scannedItemSeq ?? null,
      };
      setResult(found);
      await loadWorkItems(found.orderId);

      // 스캔 성공 시 입력란 비우기
      setTrackingNo("");
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleStartWork = async (itemIndex: number, itemName: string) => {
    if (!result) return;
    setIsProcessing((p) => ({ ...p, [itemIndex]: true }));
    try {
      const res = await fetch("/api/ops/work-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: result.orderId, itemIndex, itemName }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "작업 시작 실패"); return; }
      await loadWorkItems(result.orderId);
    } finally {
      setIsProcessing((p) => ({ ...p, [itemIndex]: false }));
    }
  };

  const handleCompleteWork = async (itemIndex: number) => {
    if (!result) return;
    setIsProcessing((p) => ({ ...p, [itemIndex]: true }));
    try {
      const res = await fetch("/api/ops/work-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: result.orderId, itemIndex, action: "complete" }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "작업 완료 실패"); return; }
      await loadWorkItems(result.orderId);
    } finally {
      setIsProcessing((p) => ({ ...p, [itemIndex]: false }));
    }
  };

  const handleReopenWork = async (itemIndex: number) => {
    if (!result) return;
    if (!confirm("작업 시작 전 상태로 되돌리시겠습니까?")) return;
    setIsProcessing((p) => ({ ...p, [itemIndex]: true }));
    try {
      const res = await fetch("/api/ops/work-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: result.orderId, itemIndex, action: "reopen" }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "되돌리기 실패"); return; }
      await loadWorkItems(result.orderId);
    } finally {
      setIsProcessing((p) => ({ ...p, [itemIndex]: false }));
    }
  };

  const getWorkItemStatus = (i: number) => workItems.find((w) => w.item_index === i) || null;

  const allItemsCompleted =
    result?.repairParts && result.repairParts.length > 0
      ? result.repairParts.every((_, i) => getWorkItemStatus(i)?.status === "COMPLETED")
      : false;

  const handleRequestExtraCharge = async () => {
    if (!result || !extraChargeReason.trim()) return;
    const isManager = userRole && ["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(userRole);
    if (isManager && (!extraChargeAmount || parseInt(extraChargeAmount) <= 0)) {
      alert("금액을 입력해주세요."); return;
    }
    setIsSubmittingExtraCharge(true);
    try {
      const res = await fetch("/api/ops/extra-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: result.orderId,
          reason: extraChargeReason,
          amount: extraChargeAmount ? parseInt(extraChargeAmount) : null,
          note: extraChargeNote || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "요청 실패");
      alert(isManager ? "✅ 고객에게 추가 결제 요청을 보냈습니다." : "✅ 요청이 접수되었습니다.");
      setShowExtraChargeDialog(false);
      setExtraChargeReason(""); setExtraChargeAmount(""); setExtraChargeNote("");
    } catch (e: any) {
      alert(`요청 실패: ${e.message}`);
    } finally {
      setIsSubmittingExtraCharge(false);
    }
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* 헤더 */}
      <div className="mb-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">작업 (Work)</h1>
          <p className="text-sm text-gray-500 mt-1">수선 작업 진행 관리</p>
        </div>
        {result && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrintPreview(true)}
            >
              <Printer className="h-4 w-4 mr-1" />
              작업지시서 출력
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={() => setShowExtraChargeDialog(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              추가 비용 요청
            </Button>
          </div>
        )}
      </div>

      {/* 스캔 인풋 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-5">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-sm text-gray-600 font-medium">
              송장번호 / 내부 바코드
            </label>
            <input
              ref={inputRef}
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="스캔 또는 직접 입력..."
              className="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={isLoading}
            className={`px-5 py-2 rounded text-white flex items-center gap-2 text-sm font-medium ${
              isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <ScanBarcode className="h-4 w-4" />
            {isLoading ? "조회 중..." : "조회"}
          </button>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* 왼쪽: 작업지시서 인라인 */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">작업지시서</h2>
              {result.scannedItemSeq && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {result.scannedItemSeq}번 항목 스캔됨
                </span>
              )}
            </div>
            <div className="p-4 overflow-auto max-h-[70vh]">
              <WorkOrderSheet
                data={buildWorkOrderData(result)}
                highlightedPartIndex={
                  result.scannedItemSeq != null ? result.scannedItemSeq - 1 : undefined
                }
              />
            </div>
          </div>

          {/* 오른쪽: 작업 아이템 관리 */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                작업 아이템 ({result.repairParts?.length ?? 0}개)
              </h2>

              {(!result.repairParts || result.repairParts.length === 0) && (
                <p className="text-sm text-gray-500">수선 항목 없음</p>
              )}

              <div className="space-y-3">
                {result.repairParts?.map((itemName, index) => {
                  const workItem = getWorkItemStatus(index);
                  const isInProgress = workItem?.status === "IN_PROGRESS";
                  const isCompleted = workItem?.status === "COMPLETED";
                  const isPending = !workItem || workItem.status === "PENDING";
                  const isProc = isProcessing[index] || false;
                  const isHighlighted = result.scannedItemSeq != null && result.scannedItemSeq - 1 === index;

                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-3 transition-all ${
                        isHighlighted
                          ? "border-blue-400 bg-blue-50 ring-2 ring-blue-300"
                          : isCompleted
                          ? "bg-green-50 border-green-200"
                          : isInProgress
                          ? "bg-blue-50 border-blue-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {isHighlighted && (
                              <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded font-bold">
                                스캔
                              </span>
                            )}
                            <span className="font-semibold text-gray-900 text-sm">
                              {index + 1}. {itemName}
                            </span>
                            {isCompleted && (
                              <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">완료</span>
                            )}
                            {isInProgress && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded flex items-center gap-1">
                                <Clock className="h-3 w-3" />작업 중
                              </span>
                            )}
                            {isPending && (
                              <span className="px-2 py-0.5 bg-gray-400 text-white text-xs rounded">대기</span>
                            )}
                          </div>
                          {workItem?.worker_name && (
                            <p className="text-xs text-gray-500 mt-0.5">작업자: {workItem.worker_name}</p>
                          )}
                          {workItem?.started_at && (
                            <p className="text-xs text-gray-400">
                              시작: {new Date(workItem.started_at).toLocaleString("ko-KR")}
                            </p>
                          )}
                          {workItem?.completed_at && (
                            <p className="text-xs text-gray-400">
                              완료: {new Date(workItem.completed_at).toLocaleString("ko-KR")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleStartWork(index, itemName)}
                          disabled={isInProgress || isCompleted || isProc}
                          className={`px-3 py-1.5 rounded text-white flex items-center gap-1.5 text-xs font-medium ${
                            isInProgress || isCompleted || isProc
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          <Play className="h-3 w-3" />
                          {isProc ? "처리 중..." : "시작"}
                        </button>
                        <button
                          onClick={() => handleCompleteWork(index)}
                          disabled={!isInProgress || isCompleted || isProc}
                          className={`px-3 py-1.5 rounded text-white flex items-center gap-1.5 text-xs font-medium ${
                            !isInProgress || isCompleted || isProc
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          <CheckCircle className="h-3 w-3" />
                          {isProc ? "처리 중..." : "완료"}
                        </button>
                        {isCompleted && (
                          <button
                            onClick={() => handleReopenWork(index)}
                            disabled={isProc}
                            className={`px-3 py-1.5 rounded text-white flex items-center gap-1.5 text-xs font-medium ${
                              isProc ? "bg-gray-300 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700"
                            }`}
                          >
                            <RotateCcw className="h-3 w-3" />
                            되돌리기
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {allItemsCompleted && (
                <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">
                    ✅ 모든 작업이 완료되었습니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 작업지시서 출력 미리보기 */}
      {showPrintPreview && result && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto print:max-w-none print:max-h-none print:shadow-none print:rounded-none print:overflow-visible">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center print:hidden">
              <h2 className="text-lg font-semibold">작업지시서 미리보기</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  인쇄
                </button>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  닫기
                </button>
              </div>
            </div>
            <div className="p-4 print:p-0">
              <WorkOrderSheet data={buildWorkOrderData(result)} />
            </div>
          </div>
        </div>
      )}

      {/* 추가 비용 요청 다이얼로그 */}
      <Dialog open={showExtraChargeDialog} onOpenChange={setShowExtraChargeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>추가 비용 요청</DialogTitle>
            <DialogDescription>
              {userRole && ["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(userRole)
                ? "추가 비용 금액과 사유를 입력하여 고객에게 청구하세요."
                : "추가 비용 발생 사유를 입력해주세요. 관리자가 검토 후 고객에게 안내합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="reason" className="mb-2 block">요청 사유 *</Label>
              <Textarea
                id="reason"
                placeholder="예: 안감 교체 필요"
                value={extraChargeReason}
                onChange={(e) => setExtraChargeReason(e.target.value)}
                rows={3}
              />
            </div>
            {userRole && ["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(userRole) && (
              <>
                <div>
                  <Label htmlFor="amount" className="mb-2 block">청구 금액 (원) *</Label>
                  <input
                    id="amount"
                    type="number"
                    placeholder="10000"
                    value={extraChargeAmount}
                    onChange={(e) => setExtraChargeAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <Label htmlFor="note" className="mb-2 block">고객 안내 메시지 (선택)</Label>
                  <Textarea
                    id="note"
                    placeholder="고객에게 전달할 내용"
                    value={extraChargeNote}
                    onChange={(e) => setExtraChargeNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}
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
              {isSubmittingExtraCharge
                ? "요청 중..."
                : userRole && ["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(userRole)
                ? "고객에게 청구"
                : "요청 보내기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
