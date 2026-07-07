"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StatusChangeDialogProps {
  orderId: string;
  trackingNo?: string;
  currentStatus: string;
  onStatusChanged?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING:          "결제 대기",
  PAID:             "결제 완료",
  BOOKED:           "수거예약",
  INBOUND:          "입고 완료",
  PROCESSING:       "수선 중",
  HOLD:             "작업 보류",
  READY_TO_SHIP:    "출고 완료",
  OUT_FOR_DELIVERY: "배송 중",
  DELIVERED:        "배송 완료",
  CANCELLED:        "취소",
  RETURN_PENDING:   "반송 대기",
  RETURN_SHIPPING:  "반송 배송 중",
  RETURN_DONE:      "반송 완료",
};

// 현재 상태 → 이동 가능한 다음 상태 (서버 ALLOWED_TRANSITIONS와 동일하게 유지)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING:          ["PAID", "CANCELLED"],
  PAID:             ["BOOKED", "CANCELLED"],
  BOOKED:           ["INBOUND", "CANCELLED"],
  INBOUND:          ["PROCESSING", "HOLD", "CANCELLED"],
  PROCESSING:       ["HOLD", "READY_TO_SHIP", "CANCELLED"],
  HOLD:             ["PROCESSING", "READY_TO_SHIP", "CANCELLED"],
  READY_TO_SHIP:    ["OUT_FOR_DELIVERY", "PROCESSING", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "READY_TO_SHIP"],
  DELIVERED:        ["RETURN_SHIPPING"],
  CANCELLED:        [],
  RETURN_PENDING:   ["RETURN_SHIPPING", "CANCELLED"],
  RETURN_SHIPPING:  ["RETURN_DONE"],
  RETURN_DONE:      [],
};

export function StatusChangeDialog({
  orderId,
  trackingNo,
  currentStatus,
  onStatusChanged,
}: StatusChangeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  // 현재 상태에서 이동 가능한 상태 목록 (없으면 전체)
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] ?? Object.keys(STATUS_LABELS);
  const availableStatuses = allowedNext.map((v) => ({
    value: v,
    label:
      v === "CANCELLED" &&
      ["INBOUND", "PROCESSING", "HOLD", "READY_TO_SHIP", "PICKED_UP"].includes(currentStatus)
        ? "취소 (반송 대기)"
        : STATUS_LABELS[v] ?? v,
  }));

  // currentStatus prop이 변경되면 selectedStatus도 동기화
  useEffect(() => {
    setSelectedStatus(currentStatus);
  }, [currentStatus]);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // API를 통해 주문 상태 변경
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status: selectedStatus,
          trackingNo: trackingNo,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || "상태 변경에 실패했습니다.");
      }

      setOpen(false);
      onStatusChanged?.();
    } catch (error: any) {
      console.error('Status update error:', error);
      const errorMessage = error?.message || error?.toString() || "알 수 없는 오류가 발생했습니다.";
      alert('상태 변경 실패: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>상태 변경</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>주문 상태 변경</DialogTitle>
          <DialogDescription>
            현재: <strong>{STATUS_LABELS[currentStatus] ?? currentStatus}</strong>
            {availableStatuses.length === 0 && " — 이 상태에서 변경 가능한 상태가 없습니다."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {availableStatuses.length > 0 ? (
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">현재 상태에서는 추가 상태 변경이 불가능합니다.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            닫기
          </Button>
          {availableStatuses.length > 0 && (
            <Button onClick={handleSubmit} disabled={loading || selectedStatus === currentStatus}>
              {loading ? "변경 중..." : "확인"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

