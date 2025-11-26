"use client";

import { useState } from "react";
import { Scan, Package, Search, FileText, Printer } from "lucide-react";
import { WorkOrderSheet, type WorkOrderData, type WorkOrderImage, type WorkOrderPin } from "@/components/ops/work-order-sheet";
import { ShippingLabelSheet, type ShippingLabelData } from "@/components/ops/shipping-label-sheet";
import WebcamRecorder from "@/components/ops/WebcamRecorder";
// ============================================
// 타입 정의
// ============================================
type ShipmentData = {
  trackingNo: string; // 입고송장번호 (pickup_tracking_no)
  outboundTrackingNo?: string; // 출고송장번호 (tracking_no)
  customerName: string;
  customerPhone?: string; // 고객 전화번호
  brandName?: string;
  status: string;
  summary: string; // 수선요청 요약
  pickupAddress: string;
  deliveryAddress: string;
  orderId: string;
  itemName: string;
  repairParts?: string[]; // 수선 부위 목록
  images?: string[]; // 이미지 URL 배열
  pinsCount?: number; // 총 핀 개수
  imagesWithPins?: any[]; // images_with_pins 원본 데이터
};

// ============================================
// API Route를 통한 조회 함수 (서버 사이드에서 RLS 우회)
// ============================================
async function lookupShipment(trackingNo: string): Promise<ShipmentData | null> {
  try {
    console.log("🔍 송장 조회 시작:", trackingNo);
    
    // API Route 호출 (서버 사이드에서 Service Role Key 사용)
    const apiUrl = `/api/ops/shipments/${encodeURIComponent(trackingNo)}`;
    console.log("📡 API URL:", apiUrl);
    
    const response = await fetch(apiUrl);
    
    console.log("📡 API 응답:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API 호출 실패:", response.status, response.statusText, errorText);
      return null;
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      console.error("❌ 조회 실패:", result.error);
      return null;
    }

    const { shipment, order } = result.data;
    console.log("📦 조회 성공:", { shipment, order });

    if (!shipment || !order) {
      console.error("❌ 필수 데이터 누락:", { shipment, order });
      return null;
    }

    // 데이터 변환
    const pickupAddr = [
      order.pickup_address,
      order.pickup_address_detail,
    ].filter(Boolean).join(" ");

    const deliveryAddr = [
      order.delivery_address,
      order.delivery_address_detail,
    ].filter(Boolean).join(" ");

    // 이미지 URL 추출
    let imageUrls: string[] = [];
    if (order.images_with_pins && Array.isArray(order.images_with_pins)) {
      imageUrls = order.images_with_pins.map((img: any) => img?.imagePath || img?.url).filter(Boolean);
    } else if (order.images?.urls && Array.isArray(order.images.urls)) {
      imageUrls = order.images.urls;
    } else if (order.image_urls && Array.isArray(order.image_urls)) {
      imageUrls = order.image_urls;
    }

    // 핀 개수 계산
    let totalPins = 0;
    if (order.images_with_pins && Array.isArray(order.images_with_pins)) {
      totalPins = order.images_with_pins.reduce((sum: number, img: any) => {
        const pins = img?.pins || [];
        return sum + (Array.isArray(pins) ? pins.length : 0);
      }, 0);
    }

    // 입고송장번호와 출고송장번호 구분
    const inboundTrackingNo = shipment.pickup_tracking_no || shipment.tracking_no || "";
    const outboundTrackingNo = shipment.tracking_no && 
                                shipment.pickup_tracking_no && 
                                shipment.tracking_no !== shipment.pickup_tracking_no
                                  ? shipment.tracking_no
                                  : undefined;

    return {
      trackingNo: inboundTrackingNo, // 입고송장번호
      outboundTrackingNo: outboundTrackingNo, // 출고송장번호
      customerName: order.customer_name || "고객명 없음",
      customerPhone: order.customer_phone || undefined,
      status: shipment.status || order.status || "UNKNOWN",
      summary: order.item_description || order.item_name || "수선 요청 정보 없음",
      pickupAddress: pickupAddr || "주소 없음",
      deliveryAddress: deliveryAddr || "주소 없음",
      orderId: order.id || "",
      itemName: order.item_name || "항목명 없음",
      repairParts: Array.isArray(order.repair_parts) ? order.repair_parts : [],
      images: imageUrls,
      pinsCount: totalPins,
      imagesWithPins: Array.isArray(order.images_with_pins) ? order.images_with_pins : [], // 원본 데이터 저장
    };
  } catch (error) {
    console.error("Shipment 조회 중 오류:", error);
    return null;
  }
}

export default function InboundPage() {
  const [trackingNo, setTrackingNo] = useState("");
  const [result, setResult] = useState<ShipmentData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWorkOrderPreview, setShowWorkOrderPreview] = useState(false);
  const [showShippingLabel, setShowShippingLabel] = useState(false);
  const [showInboundVideo, setShowInboundVideo] = useState(false);

  // 송장 조회 함수 (실제 DB 연동)
  const handleLookup = async () => {
    if (!trackingNo.trim()) {
      return;
    }

    setIsLoading(true);
    setNotFound(false);
    setResult(null);

    console.log("📦 송장 조회 시작:", trackingNo);
    
    try {
      const shipment = await lookupShipment(trackingNo.trim());
      
      if (shipment) {
        setResult(shipment);
        setNotFound(false);
        console.log("✅ 조회 성공:", shipment);
      } else {
        setResult(null);
        setNotFound(true);
        console.log("❌ 조회 실패: 해당 송장 없음");
      }
    } catch (error) {
      console.error("❌ 조회 중 오류:", error);
      setResult(null);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Enter 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLookup();
    }
  };

  // 이미지 데이터 변환 함수 (images_with_pins에서 핀 정보 추출)
  const convertToWorkOrderImages = (imageUrls?: string[], imagesWithPins?: any[]): WorkOrderImage[] => {
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

  // 입고 처리 함수
  const handleInboundProcess = async () => {
    if (!result) return;

    setIsProcessing(true);
    console.log("📦 입고 처리 시작:", result.trackingNo);

    try {
      // API Route 호출 (서버 사이드에서 RLS 우회)
      const response = await fetch("/api/ops/inbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: result.orderId,
        }),
      });

      if (!response.ok) {
        throw new Error("입고 처리 API 호출 실패");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "입고 처리 실패");
      }

      console.log("✅ 입고 처리 완료");
      
      // 출고 송장번호 표시
      if (data.outboundTrackingNo) {
        alert(`입고 처리 완료!\n\n출고 송장번호: ${data.outboundTrackingNo}\n\n작업지시서를 출력하세요.`);
      } else {
        alert("입고 처리가 완료되었습니다!\n\n⚠️ 출고 송장 생성 실패 (수동 발급 필요)");
      }

      // 결과 새로고침
      await handleLookup();
    } catch (error) {
      console.error("❌ 입고 처리 실패:", error);
      alert(`입고 처리 실패: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 입고 취소(되돌리기)
  const handleInboundRevert = async () => {
    if (!result) return;
    if (!confirm("해당 주문을 입고 전(BOOKED) 상태로 되돌릴까요?")) return;
    try {
      setIsProcessing(true);
      const res = await fetch("/api/ops/inbound", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: result.orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "입고 취소 실패");

      alert("입고 취소가 완료되었습니다.");
      await handleLookup();
    } catch (error) {
      console.error("입고 취소 실패:", error);
      alert(`입고 취소 실패: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* 상단 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">입고 처리</h1>
        <p className="text-sm text-gray-500 mt-2">
          수거 송장을 스캔해서 입고 처리하고, 출고 송장 및 작업지시서를 발행하는 화면입니다.
        </p>
      </div>

      {/* 송장 입력 섹션 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Scan className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">송장 스캔</h2>
        </div>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              수거 송장번호
            </label>
            <input
              type="text"
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="송장번호를 입력하세요 (예: 689676761...)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleLookup}
            disabled={!trackingNo.trim() || isLoading}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                조회 중...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" suppressHydrationWarning />
                조회
              </>
            )}
          </button>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="animate-pulse flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span>스캔 대기 중</span>
            </div>
          </div>
        </div>
      </div>

      {/* 스캔 결과 영역 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-gray-600" suppressHydrationWarning />
          <h2 className="text-lg font-semibold text-gray-900">스캔 결과</h2>
        </div>

        {!result && !notFound && (
          <div className="text-center py-12 text-gray-400">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-20" suppressHydrationWarning />
            <p className="text-sm">송장을 스캔하면 주문 정보가 표시됩니다</p>
          </div>
        )}

        {notFound && (
          <div className="text-center py-12">
            <div className="text-red-500 mb-2">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-20" suppressHydrationWarning />
            </div>
            <p className="text-sm text-red-600 font-medium">
              해당 송장번호로 등록된 주문을 찾을 수 없습니다.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              송장번호를 다시 확인해주세요.
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* 기본 정보 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500">송장번호</label>
                <p className="text-sm font-mono font-semibold text-gray-900 mt-1">
                  {result.trackingNo}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">고객명</label>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {result.customerName}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">상태</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    result.status === "BOOKED" 
                      ? "bg-blue-100 text-blue-700"
                      : result.status === "INBOUND"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {result.status}
                  </span>
                </div>
              </div>
            </div>

            {/* 수선 항목 */}
            {result.repairParts && result.repairParts.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <label className="text-xs font-medium text-gray-500">수선 항목</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {result.repairParts.map((part, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium"
                    >
                      {part}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 이미지 및 핀 정보 */}
            {result.images && result.images.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">
                    첨부 사진 ({result.images.length}장)
                  </label>
                  {result.pinsCount !== undefined && result.pinsCount > 0 && (
                    <span className="text-xs text-gray-600">
                      📍 수선 부위 {result.pinsCount}개 표시됨
                    </span>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {result.images.slice(0, 4).map((url, idx) => (
                    <div key={idx} className="flex-shrink-0">
                      <img
                        src={url}
                        alt={`사진 ${idx + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  ))}
                  {result.images.length > 4 && (
                    <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-500">
                        +{result.images.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 주소 정보 */}
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">수거지</label>
                  <p className="text-sm text-gray-700 mt-1">{result.pickupAddress}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">배송지</label>
                  <p className="text-sm text-gray-700 mt-1">{result.deliveryAddress}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                ※ 아래 버튼들은 아직 동작하지 않는 상태입니다 (후속 단계에서 구현).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 액션 버튼 섹션 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">처리 옵션</h2>
        
        <div className="space-y-3">
          {/* 입고 영상 촬영 */}
          <button
            disabled={!result}
            onClick={() => setShowInboundVideo(true)}
            className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              result ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            입고 영상 촬영
          </button>
          {/* 작업지시서 미리보기 */}
          <button
            disabled={!result}
            onClick={() => setShowWorkOrderPreview(true)}
            className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              result
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <FileText className="h-5 w-5" suppressHydrationWarning />
            작업지시서 미리보기
          </button>

          {/* 출고 송장 라벨 출력 */}
          <button
            disabled={!result || !result.outboundTrackingNo}
            onClick={() => setShowShippingLabel(true)}
            className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              result && result.outboundTrackingNo
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Printer className="h-5 w-5" suppressHydrationWarning />
            출고 송장 라벨 출력
          </button>

          {/* 입고 처리 */}
          <button
            disabled={!result || result.status === "INBOUND" || isProcessing}
            onClick={handleInboundProcess}
            className={`w-full px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
              result && result.status !== "INBOUND" && !isProcessing
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                입고 처리 중...
              </>
            ) : (
              <>
                <Package className="h-5 w-5" suppressHydrationWarning />
                입고 처리 + 송장 + 작업지시서
              </>
            )}
          </button>

          {/* 입고 취소(되돌리기) */}
          <button
            disabled={!result || result.status !== "INBOUND" || isProcessing}
            onClick={handleInboundRevert}
            className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              result && result.status === "INBOUND" && !isProcessing
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                되돌리는 중...
              </>
            ) : (
              <>입고 취소(되돌리기)</>
            )}
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          {!result
            ? "송장을 스캔하면 버튼이 활성화됩니다"
            : result.status === "INBOUND"
              ? "입고 취소(되돌리기)로 상태를 되돌릴 수 있습니다"
              : "버튼을 클릭하여 입고 처리하세요"}
        </div>
      </div>

      {/* 작업지시서 미리보기 다이얼로그 */}
      {showWorkOrderPreview && result && (
        <div 
          data-work-order
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:bg-white print:p-0"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto print:max-w-none print:max-h-none print:shadow-none print:rounded-none print:overflow-visible print:w-full print:h-full print:flex print:items-center print:justify-center print:bg-transparent">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center print:hidden">
              <h2 className="text-lg font-semibold">작업지시서 미리보기</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  인쇄
                </button>
                <button
                  onClick={() => setShowWorkOrderPreview(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  닫기
                </button>
              </div>
            </div>
            <div className="p-4 print:p-0 print:m-0 print:w-full print:h-full print:flex print:items-center print:justify-center print:bg-white">
              {result && (
                <WorkOrderSheet
                  data={{
                    trackingNo: result.trackingNo || "",
                    outboundTrackingNo: result.outboundTrackingNo,
                    customerName: result.customerName || "고객명 없음",
                    customerPhone: result.customerPhone,
                    itemName: result.itemName || "항목명 없음",
                    summary: result.summary || "수선 요청 정보 없음",
                    repairParts: result.repairParts || [],
                    images: convertToWorkOrderImages(result.images, result.imagesWithPins) || [],
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 출고 송장 라벨 다이얼로그 */}
      {showShippingLabel && result && result.outboundTrackingNo && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:bg-white print:p-0"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto print:max-w-none print:max-h-none print:shadow-none print:rounded-none">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center print:hidden">
              <h2 className="text-lg font-semibold">출고 송장 라벨</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  인쇄
                </button>
                <button
                  onClick={() => setShowShippingLabel(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  닫기
                </button>
              </div>
            </div>
            <div className="p-4 print:p-0 flex justify-center">
              <ShippingLabelSheet
                data={{
                  trackingNo: result.outboundTrackingNo,
                  senderName: "모두의수선",
                  senderZipcode: "41142",
                  senderAddress: "대구광역시 동구 동촌로 1 동대구우체국 2층 소포실",
                  senderPhone: "010-2723-9490",
                  recipientName: result.customerName,
                  recipientZipcode: "", // TODO: 고객 우편번호
                  recipientAddress: result.deliveryAddress,
                  recipientPhone: result.customerPhone || "",
                  goodsName: result.itemName,
                  weight: 2,
                  orderNumber: result.orderId.substring(0, 13),
                  memo: result.summary,
                  specialInstructions: "수선 완료품입니다. 조심히 다뤄주세요.",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 입고 영상 촬영 다이얼로그 */}
      {showInboundVideo && result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">입고 영상 촬영</h2>
              <button onClick={() => setShowInboundVideo(false)} className="px-3 py-2 bg-gray-200 rounded">
                닫기
              </button>
            </div>
            <div className="p-4">
              <WebcamRecorder
                orderId={result.orderId}
                onUploaded={() => {
                  setShowInboundVideo(false);
                  alert("영상이 저장되었습니다.");
                }}
                onClose={() => setShowInboundVideo(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

