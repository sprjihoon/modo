"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Package, Printer, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReturnShipmentButtonProps {
  orderId: string;
  onCreated?: () => void;
}

export function ReturnShipmentButton({ orderId, onCreated }: ReturnShipmentButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [trackingNo, setTrackingNo] = useState<string | null>(null);
  const [labelUrl, setLabelUrl] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/return-shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnFee: 6000 }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "반송 송장 생성 실패");
      }

      setTrackingNo(result.trackingNo);
      setLabelUrl(result.labelUrl);
      setShowDialog(true);
      onCreated?.();
    } catch (error: any) {
      console.error("반송 송장 생성 실패:", error);
      alert(`반송 송장 생성 실패: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePrint = () => {
    if (labelUrl) {
      window.open(labelUrl, "_blank");
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="destructive"
        onClick={handleCreate}
        disabled={isCreating}
      >
        {isCreating ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
            생성중...
          </>
        ) : (
          <>
            <Package className="h-3 w-3 mr-1" />
            반송 송장 생성
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              반송 송장 생성 완료
            </DialogTitle>
            <DialogDescription>
              고객에게 반송할 송장이 생성되었습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">송장번호</p>
              <p className="text-2xl font-mono font-bold">{trackingNo}</p>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• 송장을 출력하여 상품에 부착해주세요</p>
              <p>• 우체국 택배 기사가 수거합니다</p>
              <p>• 반송 배송비 ₩6,000은 고객에게 청구됩니다</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              닫기
            </Button>
            <Button onClick={handlePrint} disabled={!labelUrl}>
              <Printer className="h-4 w-4 mr-2" />
              송장 출력
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

