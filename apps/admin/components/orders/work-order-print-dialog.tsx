"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Printer, Loader2 } from "lucide-react";
import { WorkOrderSheet, type WorkOrderData, type WorkOrderImage, type WorkOrderPin } from "@/components/ops/work-order-sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WorkOrderPrintDialogProps {
  order: any;
}

export function WorkOrderPrintDialog({ order }: WorkOrderPrintDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workOrderData, setWorkOrderData] = useState<WorkOrderData | null>(null);

  // 다이얼로그가 열릴 때 데이터 준비
  useEffect(() => {
    if (open && !workOrderData) {
      loadWorkOrderData();
    }
  }, [open]);

  const loadWorkOrderData = async () => {
    setLoading(true);
    setError("");

    try {
      // 이미지 URL 추출
      let imageUrls: string[] = [];
      if (order.images_with_pins && Array.isArray(order.images_with_pins)) {
        imageUrls = order.images_with_pins.map((img: any) => img?.imagePath || img?.url).filter(Boolean);
      } else if (order.images?.urls && Array.isArray(order.images.urls)) {
        imageUrls = order.images.urls;
      } else if (order.image_urls && Array.isArray(order.image_urls)) {
        imageUrls = order.image_urls;
      }

      // 이미지 데이터 변환 (images_with_pins에서 핀 정보 추출)
      const convertToWorkOrderImages = (imageUrls: string[], imagesWithPins?: any[]): WorkOrderImage[] => {
        // images_with_pins가 있으면 사용
        if (imagesWithPins && Array.isArray(imagesWithPins) && imagesWithPins.length > 0) {
          return imagesWithPins.map((imgData: any) => {
            const pins: WorkOrderPin[] = (imgData.pins || []).map((pin: any) => ({
              x: pin.relative_x || pin.x || 0.5,
              y: pin.relative_y || pin.y || 0.5,
              memo: pin.memo || "",
            }));

            return {
              url: imgData.imagePath || imgData.url || "",
              pins,
            };
          });
        }
        
        // images_with_pins가 없으면 이미지만 표시
        if (!imageUrls || imageUrls.length === 0) return [];
        return imageUrls.map(url => ({ url, pins: [] }));
      };

      // shipment 정보에서 outbound 송장번호 가져오기
      let outboundTrackingNo = order.shipment?.delivery_tracking_no || order.delivery_tracking_no;
      
      // delivery_info에서도 확인
      if (!outboundTrackingNo && order.shipment?.delivery_info) {
        const deliveryInfo = typeof order.shipment.delivery_info === 'string' 
          ? JSON.parse(order.shipment.delivery_info) 
          : order.shipment.delivery_info;
        outboundTrackingNo = deliveryInfo?.regiNo || deliveryInfo?.trackingNo;
      }

      const data: WorkOrderData = {
        trackingNo: order.tracking_no || order.shipment?.pickup_tracking_no || "",
        outboundTrackingNo: outboundTrackingNo,
        customerName: order.customer_name || "고객명 없음",
        customerPhone: order.customer_phone,
        itemName: order.item_name || `${order.clothing_type || ''} - ${order.repair_type || ''}`,
        summary: order.item_description || order.item_name || "수선 요청 정보 없음",
        repairParts: Array.isArray(order.repair_parts) ? order.repair_parts : [],
        images: convertToWorkOrderImages(imageUrls, order.images_with_pins),
      };

      setWorkOrderData(data);
    } catch (err: any) {
      console.error("작업지시서 데이터 생성 실패:", err);
      setError("작업지시서 데이터를 생성할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            작업지시서 출력
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>작업지시서 출력</DialogTitle>
            <DialogDescription>
              작업지시서를 출력하거나 PDF로 저장할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">작업지시서 준비 중...</span>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!loading && !error && workOrderData && (
              <div className="space-y-4">
                <div className="text-sm space-y-2 bg-muted p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">주문번호:</span>
                    <span className="font-mono">{order.id.substring(0, 13)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">고객명:</span>
                    <span className="font-medium">{workOrderData.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">수선 항목:</span>
                    <span className="font-medium">{workOrderData.itemName}</span>
                  </div>
                </div>

                <div className="border rounded-lg bg-gray-50 overflow-auto max-h-[600px]">
                  <div className="flex justify-center p-4 print:p-0 print:m-0 print:w-full print:h-full print:flex print:items-center print:justify-center print:bg-white">
                    <div className="transform scale-50 origin-top print:scale-100">
                      <WorkOrderSheet data={workOrderData} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              취소
            </Button>
            <Button onClick={handlePrint} disabled={loading || !workOrderData}>
              <Printer className="h-4 w-4 mr-2" />
              인쇄하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 0; 
          }
          body * {
            visibility: hidden;
          }
          .work-order-container,
          .work-order-container * {
            visibility: visible;
          }
          .work-order-container {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  );
}

