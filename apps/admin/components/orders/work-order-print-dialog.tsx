"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Printer, Loader2, X } from "lucide-react";
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

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={handleOpen}>
        <FileText className="h-4 w-4 mr-2" />
        작업지시서 출력
      </Button>

      {open && (
        <div 
          data-work-order
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:bg-white print:p-0"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto print:max-w-none print:max-h-none print:shadow-none print:rounded-none print:overflow-visible print:w-full print:h-full print:flex print:items-center print:justify-center print:bg-transparent">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center print:hidden z-10">
              <div>
                <h2 className="text-lg font-semibold">작업지시서 미리보기</h2>
                <div className="text-sm text-gray-600 mt-1 space-y-1">
                  <div>주문번호: {order.id.substring(0, 13)}...</div>
                  {workOrderData && (
                    <>
                      <div>고객명: {workOrderData.customerName}</div>
                      <div>수선 항목: {workOrderData.itemName}</div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  disabled={loading || !workOrderData}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  인쇄
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  닫기
                </button>
              </div>
            </div>

            <div className="p-4 print:p-0 print:m-0 print:w-full print:h-full print:flex print:items-center print:justify-center print:bg-white">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">작업지시서 준비 중...</span>
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="m-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!loading && !error && workOrderData && (
                <WorkOrderSheet data={workOrderData} />
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 0; 
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          
          body * {
            visibility: hidden !important;
          }
          
          [data-work-order],
          [data-work-order] *,
          .work-order-container,
          .work-order-container * {
            visibility: visible !important;
          }
          
          [data-work-order] {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: white !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
          }
          
          .work-order-container {
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            max-height: 297mm !important;
            overflow: hidden !important;
          }
        }
      `}</style>
    </>
  );
}

