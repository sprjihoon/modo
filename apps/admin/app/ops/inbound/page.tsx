"use client";

import { useState, useEffect } from "react";
import { Scan, Package, Search, FileText, Printer } from "lucide-react";
import { WorkOrderSheet, type WorkOrderData, type WorkOrderImage, type WorkOrderPin } from "@/components/ops/work-order-sheet";
import { ShippingLabelSheet, type ShippingLabelData } from "@/components/ops/shipping-label-sheet";
import WebcamRecorder from "@/components/ops/WebcamRecorder";
import { lookupDeliveryCode } from "@/lib/delivery-code-lookup";
// ============================================
// 타입 정의
// ============================================
type ShipmentData = {
  trackingNo: string; // 입고송장번호 (pickup_tracking_no)
  outboundTrackingNo?: string; // 출고송장번호 (tracking_no)
  customerName: string;
  customerPhone?: string; // 고객 전화번호
  customerZipcode?: string; // 고객 우편번호 (추가)
  brandName?: string;
  status: string;
  deliveryInfo?: any; // 우체국 API 응답 정보
  summary: string; // 수선요청 요약
  pickupAddress: string;
  deliveryAddress: string;
  orderId: string;
  itemName: string;
  repairParts?: string[]; // 수선 부위 목록
  images?: string[]; // 이미지 URL 배열
  pinsCount?: number; // 총 핀 개수
  imagesWithPins?: any[]; // images_with_pins 원본 데이터
  order?: any; // 주문 정보 전체 (created_at, weight, volume, total_amount, payment_method 등)
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
    console.log("📦 조회 성공 - Order ID:", order?.id, "Shipment:", shipment?.tracking_no);
    console.log("👤 고객 정보:", {
      customer_name: order?.customer_name,
      customer_phone: order?.customer_phone,
      item_name: order?.item_name,
    });
    // delivery_info 파싱 (JSON 문자열인 경우)
    let deliveryInfo = shipment?.delivery_info;
    if (deliveryInfo && typeof deliveryInfo === 'string') {
      try {
        deliveryInfo = JSON.parse(deliveryInfo);
        console.log("📋 delivery_info 파싱 성공:", deliveryInfo);
      } catch (e) {
        console.warn("⚠️ delivery_info 파싱 실패:", e);
        deliveryInfo = null;
      }
    }
    console.log("📋 delivery_info:", deliveryInfo);

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
    
    // 출고송장번호: delivery_tracking_no 우선, 없으면 delivery_info에서 regiNo 확인
    let outboundTrackingNo = shipment.delivery_tracking_no || 
                              shipment.outbound_tracking_no;
    
    // delivery_info에서 송장번호 확인 (우체국 API 응답)
    if (!outboundTrackingNo && shipment.delivery_info) {
      const deliveryInfo = typeof shipment.delivery_info === 'string' 
        ? JSON.parse(shipment.delivery_info) 
        : shipment.delivery_info;
      outboundTrackingNo = deliveryInfo?.regiNo || deliveryInfo?.trackingNo;
    }
    
    // 마지막 fallback: tracking_no가 pickup_tracking_no와 다르면 출고송장으로 간주
    if (!outboundTrackingNo && shipment.tracking_no && 
        shipment.pickup_tracking_no && 
        shipment.tracking_no !== shipment.pickup_tracking_no) {
      outboundTrackingNo = shipment.tracking_no;
    }

    // images_with_pins 데이터 확인 로그
    if (order.images_with_pins) {
      console.log("📌 images_with_pins 데이터:", JSON.stringify(order.images_with_pins, null, 2));
    } else {
      console.log("📌 images_with_pins 데이터 없음");
    }

    // images_with_pins 처리 (JSON 문자열일 경우 파싱)
    let imagesWithPinsData = [];
    if (Array.isArray(order.images_with_pins)) {
      imagesWithPinsData = order.images_with_pins;
    } else if (typeof order.images_with_pins === 'string') {
      try {
        imagesWithPinsData = JSON.parse(order.images_with_pins);
      } catch (e) {
        console.error("images_with_pins 파싱 실패:", e);
      }
    }

    return {
      trackingNo: inboundTrackingNo, // 입고송장번호
      outboundTrackingNo: outboundTrackingNo, // 출고송장번호
      customerName: order.customer_name || "고객명 없음",
      customerPhone: order.customer_phone || undefined,
      customerZipcode: order.delivery_zipcode, // 우편번호 매핑
      brandName: "브랜드 없음", // TODO: 브랜드 정보 추가 필요
      status: shipment.status || order.status || "UNKNOWN",
      deliveryInfo: deliveryInfo || shipment.delivery_info, // 파싱된 delivery_info 사용
      summary: order.item_description || order.item_name || "수선 요청 정보 없음",
      pickupAddress: pickupAddr || "주소 없음",
      deliveryAddress: deliveryAddr || "주소 없음",
      orderId: order.id || "",
      itemName: order.item_name || "항목명 없음",
      repairParts: Array.isArray(order.repair_parts) ? order.repair_parts : [],
      images: imageUrls,
      pinsCount: totalPins,
      imagesWithPins: imagesWithPinsData, // 수정된 데이터 사용
      order: order, // 주문 정보 전체 추가 (주문일, 중량, 용적 등)
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
  const [labelLayout, setLabelLayout] = useState<any[] | null>(null); // 저장된 레이아웃
  const [companyInfo, setCompanyInfo] = useState<any>(null); // 회사 정보 (출고 주소지)

  // 저장된 레이아웃 및 회사 정보 불러오기
  useEffect(() => {
    const loadData = async () => {
      try {
        // 레이아웃 로드
        const layoutResponse = await fetch("/api/admin/settings/label-layout");
        const layoutData = await layoutResponse.json();
        if (layoutData.success && layoutData.layout) {
          setLabelLayout(layoutData.layout);
        }

        // 회사 정보 로드 (출고 주소지)
        const companyResponse = await fetch("/api/admin/settings/company-info");
        const companyData = await companyResponse.json();
        if (companyData.success && companyData.data) {
          setCompanyInfo(companyData.data);
          console.log("🏢 회사 정보 로드 완료:", companyData.data);
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      }
    };
    loadData();
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWorkOrderPreview, setShowWorkOrderPreview] = useState(false);
  const [showShippingLabel, setShowShippingLabel] = useState(false);
  const [showInboundVideo, setShowInboundVideo] = useState(false);
  const [currentVideoSequence, setCurrentVideoSequence] = useState<number>(1);
  const [showBoxOpenVideo, setShowBoxOpenVideo] = useState(false);

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
        console.log("✅ 조회 성공 - Order ID:", shipment.orderId, "Items:", shipment.repairParts?.length || 0);
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
        console.error("❌ 입고 처리 응답 에러:", data);
        throw new Error(data.error || `입고 처리 실패: ${JSON.stringify(data)}`);
      }

      console.log("✅ 입고 처리 완료:", data);
      
      // 출고 송장번호 표시
      if (data.outboundTrackingNo) {
        alert(`입고 처리 완료!\n\n출고 송장번호: ${data.outboundTrackingNo}\n\n작업지시서를 출력하세요.`);
      } else {
        // data.error가 있으면 함께 표시
        const errorMsg = data.error ? `\n\n사유: ${data.error}` : "";
        alert(`입고 처리가 완료되었습니다!\n\n⚠️ 출고 송장 생성 실패 (수동 발급 필요)${errorMsg}`);
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
          {/* 박스 오픈 영상 촬영 */}
          <button
            disabled={!result}
            onClick={() => setShowBoxOpenVideo(true)}
            className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              result
                ? "bg-orange-600 text-white hover:bg-orange-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <span className="text-lg">📦</span>
            박스 오픈 영상 촬영 (CS 확인용)
          </button>

          {/* 입고 영상 촬영 - 아이템별 */}
          {result && (() => {
            const itemCount = Math.max(
              result.images?.length || 0,
              result.repairParts?.length || 0,
              result.imagesWithPins?.length || 0,
              1
            );
            
            return (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  입고 영상 촬영 ({itemCount}개 아이템)
                </div>
                {Array.from({ length: itemCount }, (_, i) => {
                  const seq = i + 1;
                  const itemName = result.repairParts?.[i] || `${seq}번 아이템`;
                  
                  return (
                    <button
                      key={seq}
                      onClick={() => {
                        setCurrentVideoSequence(seq);
                        setShowInboundVideo(true);
                      }}
                      className="w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 bg-purple-600 text-white hover:bg-purple-700"
                    >
                      <span className="text-lg">📹</span>
                      {seq}번 {itemName} 촬영
                    </button>
                  );
                })}
              </div>
            );
          })()}
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
                customLayout={labelLayout}
                data={(() => {
                  console.log('🔍 원본 deliveryInfo:', result.deliveryInfo);
                  console.log('🔍 고객 우편번호:', result.customerZipcode);
                  
                  // 집배코드 정보: result.deliveryInfo에 실제 DB/API 조회 결과가 있으면 우선 사용
                  let deliveryCode = result.deliveryInfo || {};
                  
                  // deliveryInfo가 객체인지 확인 (null, undefined, 빈 객체 체크)
                  const hasDeliveryInfo = deliveryCode && 
                                         typeof deliveryCode === 'object' && 
                                         Object.keys(deliveryCode).length > 0;
                  
                  // 실제 조회된 값이 있는지 확인 (우체국 API나 DB에서 조회된 값)
                  const hasRealData = hasDeliveryInfo && (
                    deliveryCode.sortCode1 || 
                    deliveryCode.sortCode2 || 
                    deliveryCode.sortCode3 || 
                    deliveryCode.sortCode4 ||
                    deliveryCode.delivAreaCd || 
                    deliveryCode.courseNo ||
                    deliveryCode.arrCnpoNm ||
                    deliveryCode.delivPoNm ||
                    deliveryCode.regiNo // 송장번호도 확인
                  );
                  
                  console.log('🔍 deliveryInfo 확인:', {
                    hasDeliveryInfo,
                    hasRealData,
                    deliveryInfo: deliveryCode,
                    sortCode1: deliveryCode.sortCode1,
                    sortCode2: deliveryCode.sortCode2,
                    sortCode3: deliveryCode.sortCode3,
                    sortCode4: deliveryCode.sortCode4,
                    delivAreaCd: deliveryCode.delivAreaCd,
                    courseNo: deliveryCode.courseNo,
                    arrCnpoNm: deliveryCode.arrCnpoNm,
                    delivPoNm: deliveryCode.delivPoNm,
                    regiNo: deliveryCode.regiNo,
                  });
                  
                  // 실제 조회된 값이 없을 때만 fallback 사용 (하드코딩 방지)
                  if (!hasRealData && result.customerZipcode) {
                    console.warn('⚠️ 집배코드 정보 없음 - 실제 DB/API 조회 필요:', {
                      customerZipcode: result.customerZipcode,
                      deliveryInfo: deliveryCode,
                    });
                    // fallback은 사용하지 않고 경고만 표시
                    // 실제로는 출고 송장 생성 시 집배코드가 조회되어야 함
                    console.warn('⚠️ 하드코딩된 fallback 사용하지 않음 - 출고 송장 생성 시 집배코드 조회 필요');
                  } else if (hasRealData) {
                    console.log('✅ 실제 조회된 집배코드 사용:', deliveryCode);
                  } else {
                    console.warn('⚠️ 집배코드 정보 없음 - 빈 값 사용');
                  }
                  
                  // delivAreaCd가 없으면 courseNo에서 변환
                  if (!deliveryCode.delivAreaCd && deliveryCode.courseNo) {
                    deliveryCode.delivAreaCd = `-${deliveryCode.courseNo}-`;
                  }
                  
                  // delivAreaCd 정리: 숫자만 있으면 하이픈 추가, 잘못된 값 제거
                  if (deliveryCode.delivAreaCd) {
                    // "-경1 7 0 1 4 8 0 5 -" 같은 잘못된 형식 제거
                    const cleanDelivAreaCd = deliveryCode.delivAreaCd.trim();
                    // 숫자만 포함된 경우에만 처리 (한글, 공백 등이 포함되면 무시)
                    if (/^[\d-]+$/.test(cleanDelivAreaCd.replace(/-/g, ''))) {
                      // 하이픈이 없으면 추가
                      if (!cleanDelivAreaCd.includes('-')) {
                        deliveryCode.delivAreaCd = `-${cleanDelivAreaCd}-`;
                      } else {
                        deliveryCode.delivAreaCd = cleanDelivAreaCd;
                      }
                    } else {
                      // 잘못된 형식이면 빈 문자열로 설정
                      console.warn('⚠️ 잘못된 delivAreaCd 형식:', deliveryCode.delivAreaCd);
                      deliveryCode.delivAreaCd = '';
                    }
                  }
                  
                  // 실제 조회된 데이터가 있으면 로그 출력
                  if (hasRealData) {
                    console.log('✅ 실제 조회된 집배코드 사용:', {
                      sortCode1: deliveryCode.sortCode1,
                      sortCode2: deliveryCode.sortCode2,
                      sortCode3: deliveryCode.sortCode3,
                      sortCode4: deliveryCode.sortCode4,
                      delivAreaCd: deliveryCode.delivAreaCd
                    });
                  }
                  
                  console.log('📋 최종 송장 데이터:', {
                    sortCode1: deliveryCode.sortCode1,
                    sortCode2: deliveryCode.sortCode2,
                    sortCode3: deliveryCode.sortCode3,
                    sortCode4: deliveryCode.sortCode4,
                    delivAreaCd: deliveryCode.delivAreaCd,
                    arrCnpoNm: deliveryCode.arrCnpoNm,
                    delivPoNm: deliveryCode.delivPoNm,
                  });
                  
                  // 실제 우체국 API에서 받은 송장번호 확인
                  // deliveryInfo에서 regiNo 확인 (우체국 API 응답)
                  const deliveryTrackingNo = result.deliveryInfo?.regiNo || 
                                             result.deliveryInfo?.trackingNo ||
                                             result.outboundTrackingNo;
                  
                  console.log('📦 출고 송장번호 확인:', {
                    outboundTrackingNo: result.outboundTrackingNo,
                    deliveryInfoRegiNo: result.deliveryInfo?.regiNo,
                    deliveryInfoTrackingNo: result.deliveryInfo?.trackingNo,
                    finalTrackingNo: deliveryTrackingNo,
                    source: result.deliveryInfo?.regiNo ? 'deliveryInfo.regiNo' : 
                            result.outboundTrackingNo ? 'shipment.delivery_tracking_no' : 'none'
                  });
                  
                  if (!deliveryTrackingNo) {
                    console.error('❌ 출고 송장번호 없음 - 송장 출력 불가');
                    alert('출고 송장번호가 없습니다. 출고 송장을 먼저 생성해주세요.');
                    return null;
                  }
                  
                  // 주문 정보 가져오기 (result.order에서 가져오기)
                  const orderData = (result as any).order || {};
                  
                  // 주문일 포맷팅 (created_at 사용)
                  const formatOrderDate = (dateString?: string) => {
                    if (!dateString) return new Date().toLocaleDateString('ko-KR', { 
                      year: 'numeric', 
                      month: 'numeric', 
                      day: 'numeric' 
                    }).replace(/\./g, '.').trim();
                    
                    const date = new Date(dateString);
                    return date.toLocaleDateString('ko-KR', { 
                      year: 'numeric', 
                      month: 'numeric', 
                      day: 'numeric' 
                    }).replace(/\./g, '.').trim();
                  };

                  // 출고 주소지 (company_info에서 가져오기, 없으면 기본값)
                  // 회사 정보가 있으면 우선 사용
                  const senderAddress = companyInfo?.address || 
                    "대구 동구 동촌로 1 (인석동, 동대구우체국, 경북지방우정청) 동대구 우체국 소포실";
                  const senderName = companyInfo?.company_name 
                    ? companyInfo.company_name.split('(')[0].trim() 
                    : "모두의수선";
                  const senderPhone = companyInfo?.phone || "010-2723-9490";
                  
                  console.log("🏢 보낸분 정보 (회사 정보):", {
                    companyInfo,
                    senderAddress,
                    senderName,
                    senderPhone,
                  });

                  // 받는 분 (수거지와 배송지가 동일한지 확인)
                  // "수거지와 배송지가 동일합니다" 플래그 확인
                  // 플래그가 true(동일)이면: 수거지 주소 사용 (주문자가 수거 신청한 주소)
                  // 플래그가 false(다름)이면: 배송지 주소 사용 (받아볼 수 있는 주소)
                  const isSameAddress = orderData.is_pickup_delivery_same !== false && 
                                       orderData.is_same_address !== false; // 기본값은 true (동일)
                  
                  const recipientAddress = isSameAddress 
                    ? result.pickupAddress  // 수거지와 배송지가 동일하면 수거지 주소 사용 (수거 신청 주소)
                    : result.deliveryAddress; // 다르면 배송지 주소 사용 (받아볼 수 있는 주소)
                  
                  // 우편번호도 동일하게 처리
                  const recipientZipcode = isSameAddress
                    ? orderData.pickup_zipcode || result.customerZipcode || ""
                    : orderData.delivery_zipcode || result.customerZipcode || "";
                  
                  console.log("📍 받는 사람 주소 결정:", {
                    isSameAddress,
                    is_pickup_delivery_same: orderData.is_pickup_delivery_same,
                    is_same_address: orderData.is_same_address,
                    pickupAddress: result.pickupAddress,
                    deliveryAddress: result.deliveryAddress,
                    finalAddress: recipientAddress,
                    pickupZipcode: orderData.pickup_zipcode,
                    deliveryZipcode: orderData.delivery_zipcode,
                    finalZipcode: recipientZipcode,
                  });

                  return {
                    trackingNo: deliveryTrackingNo || '',
                    
                    // 주문 정보 (실제 DB 값 사용)
                    orderDate: formatOrderDate(orderData.created_at),
                    recipientName: result.customerName,
                    sellerName: senderName, // 회사명 사용
                    orderNumber: result.deliveryInfo?.resNo?.substring(result.deliveryInfo.resNo.length - 6) || 
                                result.orderId.substring(0, 6),
                    customerOrderSource: senderName, // 고객 주문처에도 회사명 사용
                    
                    // 보내는 분 (company_info에서 가져온 값)
                    senderAddress: senderAddress,
                    senderName: senderName,
                    senderPhone: senderPhone,
                    
                    // 받는 분
                    recipientZipcode: recipientZipcode,
                    recipientAddress: recipientAddress,
                    recipientPhone: result.customerPhone || "",
                    
                    // 상품 정보 (실제 수선 아이템 수 반영)
                    // repairParts 배열의 길이가 실제 수선 건수
                    totalQuantity: result.repairParts?.length || 1,
                    // 실제 수선 아이템들을 리스트로 표시
                    itemsList: result.repairParts && result.repairParts.length > 0
                      ? result.repairParts.map((part: string, idx: number) => `${idx + 1}. ${part}`).join('\n')
                      : result.itemName || "거래물품",
                    memo: result.summary,
                    
                    // 기타 (주문 정보에서 가져오기, 없으면 기본값)
                    weight: orderData.weight ? `${orderData.weight}kg` : "2kg",
                    volume: orderData.volume ? `${orderData.volume}cm` : "60cm",
                    
                    // 우체국 분류 코드
                    deliveryPlaceCode: deliveryCode.arrCnpoNm || "",
                    deliveryTeamCode: deliveryCode.delivPoNm || "",
                    // deliverySequence는 delivAreaCd만 사용 (sortCode 조합이 아님!)
                    deliverySequence: (() => {
                      let seq = deliveryCode.delivAreaCd || (deliveryCode.courseNo ? `-${deliveryCode.courseNo}-` : "");
                      // 잘못된 형식 필터링: sortCode들이 조합된 경우 제거
                      if (seq && (seq.includes('경') || seq.includes('A') || seq.includes('부') || seq.includes('광') || seq.includes('충'))) {
                        console.warn('⚠️ deliverySequence에 잘못된 값 감지:', seq);
                        seq = ''; // 잘못된 값 제거
                      }
                      // 숫자만 있으면 하이픈 추가
                      if (seq && !seq.includes('-') && /^\d+$/.test(seq)) {
                        seq = `-${seq}-`;
                      }
                      return seq;
                    })(),
                    
                    // 집배코드 상세 (경1 701 56 05)
                    sortCode1: deliveryCode.sortCode1 || "",
                    sortCode2: deliveryCode.sortCode2 || "",
                    sortCode3: deliveryCode.sortCode3 || "",
                    sortCode4: deliveryCode.sortCode4 || "",
                    printAreaCd: deliveryCode.printAreaCd || "", // 우체국 API: 인쇄용 집배코드
                  };
                })()}
              />
            </div>
          </div>
        </div>
      )}

      {/* 입고 영상 촬영 다이얼로그 */}
      {showInboundVideo && result && (() => {
        // 렌더링 시점에 값을 추출 (클로저 순환 참조 방지)
        const seq = currentVideoSequence;
        const orderIdValue = result.orderId;
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold">입고 영상 촬영 - {seq}번 아이템</h2>
                <button 
                  onClick={() => {
                    console.log('🚪 입고 다이얼로그 닫기');
                    setShowInboundVideo(false);
                  }} 
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                >
                  닫기
                </button>
              </div>
              <div className="p-4">
                <WebcamRecorder
                  orderId={orderIdValue}
                  sequence={seq}
                  onUploaded={(videoId, duration) => {
                    console.log(`✅ 입고 ${seq}번 업로드 완료: ${videoId}`);
                    
                    setShowInboundVideo(false);
                    
                    setTimeout(() => {
                      alert(`✅ ${seq}번 아이템 입고 영상이 저장되었습니다.\n\n영상 길이: ${duration}초\n영상 ID: ${videoId}`);
                    }, 100);
                  }}
                  onClose={() => {
                    console.log('🚪 입고 WebcamRecorder 닫기');
                    setShowInboundVideo(false);
                  }}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* 박스 오픈 영상 촬영 다이얼로그 */}
      {showBoxOpenVideo && result && (() => {
        const orderIdValue = result.orderId;
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold">📦 박스 오픈 영상 촬영 (CS 확인용)</h2>
                <button 
                  onClick={() => {
                    console.log('🚪 박스 오픈 다이얼로그 닫기');
                    setShowBoxOpenVideo(false);
                  }} 
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                >
                  닫기
                </button>
              </div>
              <div className="p-4">
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    📦 <strong>박스 오픈 영상</strong>은 고객에게 보여주는 영상이 아닌, CS 분쟁 발생 시 확인용으로 사용됩니다.<br />
                    박스를 개봉하는 전 과정을 촬영해주세요.
                  </p>
                </div>
                <WebcamRecorder
                  orderId={orderIdValue}
                  sequence={0}
                  onUploaded={(videoId, duration) => {
                    console.log(`✅ 박스 오픈 영상 업로드 완료: ${videoId}`);
                    
                    setShowBoxOpenVideo(false);
                    
                    setTimeout(() => {
                      alert(`✅ 박스 오픈 영상이 저장되었습니다.\n\n영상 길이: ${duration}초\n영상 ID: ${videoId}\n\n※ 이 영상은 CS 확인용으로만 사용됩니다.`);
                    }, 100);
                  }}
                  onClose={() => {
                    console.log('🚪 박스 오픈 WebcamRecorder 닫기');
                    setShowBoxOpenVideo(false);
                  }}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

