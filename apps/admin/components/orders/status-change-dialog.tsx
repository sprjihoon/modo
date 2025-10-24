"use client";

import { useState } from "react";
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
import { updateOrderStatus, updateShipmentStatus } from "@/lib/api/orders";

interface StatusChangeDialogProps {
  orderId: string;
  trackingNo?: string;
  currentStatus: string;
  onStatusChanged?: () => void;
}

const statuses = [
  { value: "PENDING", label: "결제 대기" },
  { value: "PAID", label: "결제 완료" },
  { value: "BOOKED", label: "수거예약" },
  { value: "INBOUND", label: "입고 완료" },
  { value: "PROCESSING", label: "수선 중" },
  { value: "READY_TO_SHIP", label: "출고 완료" },
  { value: "DELIVERED", label: "배송 완료" },
  { value: "CANCELLED", label: "취소" },
];

export function StatusChangeDialog({
  orderId,
  trackingNo,
  currentStatus,
  onStatusChanged,
}: StatusChangeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // 주문 상태 변경
      await updateOrderStatus(orderId, selectedStatus);

      // 송장 상태도 변경 (있을 경우)
      if (trackingNo) {
        await updateShipmentStatus(trackingNo, selectedStatus);
      }

      setOpen(false);
      onStatusChanged?.();
    } catch (error) {
      console.error('Status update error:', error);
      alert('상태 변경 실패: ' + error);
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
            변경할 상태를 선택하세요
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="상태 선택" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "변경 중..." : "확인"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

