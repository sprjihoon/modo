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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit, ExternalLink, Truck, Package2 } from "lucide-react";

interface TrackingManageDialogProps {
  orderId: string;
  pickupTrackingNo?: string;
  deliveryTrackingNo?: string;
  onUpdated?: () => void;
}

export function TrackingManageDialog({
  orderId,
  pickupTrackingNo,
  deliveryTrackingNo,
  onUpdated,
}: TrackingManageDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pickupNo, setPickupNo] = useState(pickupTrackingNo || "");
  const [deliveryNo, setDeliveryNo] = useState(deliveryTrackingNo || "");

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: API 호출하여 운송장 번호 업데이트
      const response = await fetch(`/api/orders/${orderId}/tracking`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickup_tracking_no: pickupNo,
          delivery_tracking_no: deliveryNo,
        }),
      });

      if (response.ok) {
        setOpen(false);
        onUpdated?.();
      }
    } catch (error) {
      console.error('운송장 번호 업데이트 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openTrackingUrl = (trackingNo: string) => {
    if (!trackingNo) return;
    const url = `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${trackingNo}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          운송장 관리
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>운송장 번호 관리</DialogTitle>
          <DialogDescription>
            수거 및 배송 운송장 번호를 관리합니다
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* 수거 운송장 */}
          <div className="space-y-2">
            <Label htmlFor="pickup" className="flex items-center gap-2">
              <Package2 className="h-4 w-4 text-blue-600" />
              수거 운송장 번호
            </Label>
            <div className="flex gap-2">
              <Input
                id="pickup"
                placeholder="예: 6012345678901"
                value={pickupNo}
                onChange={(e) => setPickupNo(e.target.value)}
                className="font-mono"
              />
              {pickupNo && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => openTrackingUrl(pickupNo)}
                  title="배송추적"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
            {pickupNo && (
              <p className="text-xs text-muted-foreground">
                고객 → 수선소 (수거)
              </p>
            )}
          </div>

          {/* 배송 운송장 */}
          <div className="space-y-2">
            <Label htmlFor="delivery" className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-green-600" />
              배송 운송장 번호
            </Label>
            <div className="flex gap-2">
              <Input
                id="delivery"
                placeholder="예: 6012345678902"
                value={deliveryNo}
                onChange={(e) => setDeliveryNo(e.target.value)}
                className="font-mono"
              />
              {deliveryNo && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => openTrackingUrl(deliveryNo)}
                  title="배송추적"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
            {deliveryNo && (
              <p className="text-xs text-muted-foreground">
                수선소 → 고객 (배송)
              </p>
            )}
          </div>

          {/* 안내 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>수거 운송장</strong>: 고객으로부터 물품을 수거할 때 발급<br/>
              💡 <strong>배송 운송장</strong>: 수선 완료 후 고객에게 발송할 때 발급
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


