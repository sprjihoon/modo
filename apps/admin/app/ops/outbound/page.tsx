
"use client";

import { useState } from "react";
import { Send, Video } from "lucide-react";
import WebcamRecorder from "@/components/ops/WebcamRecorder";
import { isIslandArea, getIslandAreaInfo } from "@/lib/island-area";

type LookupResult = {
  orderId: string;
  trackingNo?: string;
  status: string;
  repairItems?: Array<{ id: string; repairPart: string; }>; // 수선 항목들
  customerName?: string;
  deliveryAddress?: string;
  deliveryZipcode?: string;
  isIslandArea?: boolean;
  islandAreaInfo?: { region: string; estimatedDays: string; additionalFee: number } | null;
};

export default function OutboundPage() {
  const [trackingNo, setTrackingNo] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [currentVideoSequence, setCurrentVideoSequence] = useState<number>(1);
  const [currentItemName, setCurrentItemName] = useState<string>(""); // 촬영 중인 아이템 이름
  const [inboundDurations, setInboundDurations] = useState<Record<number, number>>({});

  const handleLookup = async () => {
    if (!trackingNo.trim()) return;
    setIsLoading(true);
    setResult(null);
    setInboundDurations({});
    try {
      const res = await fetch(`/api/ops/shipments/${encodeURIComponent(trackingNo.trim())}`);
      
      // 응답을 텍스트로 받아서 안전하게 파싱
      const responseText = await res.text();
      let json: any;
      
      try {
        json = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON 파싱 실패:', parseError);
        setResult(null);
        return;
      }
      
      if (!res.ok || !json?.data) {
        setResult(null);
        return;
      }
      
      const shipmentData = json.data.shipment;
      const orderData = json.data.order;
      
      // 필요한 필드만 안전하게 추출
      console.log('📦 Order ID:', orderData?.id);
      
      // images_with_pins를 기반으로 아이템 개수 파악
      let imagesWithPinsCount = 0;
      let repairPartsCount = 0;
      
      if (Array.isArray(orderData?.images_with_pins)) {
        imagesWithPinsCount = orderData.images_with_pins.length;
      }
      if (Array.isArray(orderData?.repair_parts)) {
        repairPartsCount = orderData.repair_parts.length;
      }
      
      console.log('📦 images_with_pins:', imagesWithPinsCount, '개');
      console.log('📦 repair_parts:', repairPartsCount, '개');
      
      // 배열 복사 (원본과 완전히 분리)
      const imagesWithPins = imagesWithPinsCount > 0 ? [...orderData.images_with_pins] : [];
      const repairParts = repairPartsCount > 0 ? [...orderData.repair_parts] : [];
      
      // 아이템 목록 생성 (완전히 새로운 primitive 값만 사용)
      const parsedItems: Array<{ id: string; repairPart: string }> = [];
      
      if (Array.isArray(imagesWithPins) && imagesWithPins.length > 0) {
        // images_with_pins를 기반으로 아이템 생성 (필드 명시 추출)
        for (let idx = 0; idx < imagesWithPins.length; idx++) {
          const img = imagesWithPins[idx];
          const repairPart = repairParts[idx] || `아이템 ${idx + 1}`;
          
          parsedItems.push({
            id: `item_${idx + 1}`,
            repairPart: String(repairPart), // 문자열로 명시 변환
          });
        }
      } else if (Array.isArray(repairParts) && repairParts.length > 0) {
        // repair_parts만 있으면 그것 기반으로 생성
        for (let idx = 0; idx < repairParts.length; idx++) {
          parsedItems.push({
            id: `item_${idx + 1}`,
            repairPart: String(repairParts[idx]),
          });
        }
      }
      
      // 도서산간 지역 확인
      const deliveryZip = String(orderData?.delivery_zipcode || '');
      const pickupZip = String(orderData?.pickup_zipcode || '');
      const isIsland = isIslandArea(deliveryZip) || isIslandArea(pickupZip);
      const islandInfo = isIsland 
        ? (getIslandAreaInfo(deliveryZip) || getIslandAreaInfo(pickupZip))
        : null;

      // 완전히 새로운 객체 생성 (primitive 값만 사용)
      const found: LookupResult = {
        orderId: String(shipmentData.order_id || ''),
        trackingNo: String(shipmentData.tracking_no || ''),
        status: String(shipmentData.status || ''),
        repairItems: parsedItems,
        customerName: String(orderData?.customer_name || ''),
        deliveryAddress: String(orderData?.delivery_address || ''),
        deliveryZipcode: deliveryZip,
        isIslandArea: isIsland,
        islandAreaInfo: islandInfo,
      };
      
      console.log(`✅ 주문 조회 완료: ${parsedItems.length}개 아이템`);
      
      // state 업데이트 (완전히 새로운 객체)
      setResult(found);
      
      // 입고 영상 duration 조회
      const pickupTrackingNo = shipmentData.pickup_tracking_no || shipmentData.tracking_no;
      await loadInboundDurations(pickupTrackingNo);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInboundDurations = async (pickupTrackingNo: string) => {
    try {
      const res = await fetch(`/api/ops/video/durations?trackingNo=${pickupTrackingNo}&type=inbound_video`);
      const json = await res.json();
      if (json.success && json.durations) {
        const durationsMap: Record<number, number> = {};
        json.durations.forEach((item: any) => {
          durationsMap[item.sequence] = item.duration_seconds;
        });
        setInboundDurations(durationsMap);
        console.log("✅ 입고 영상 duration 로드:", durationsMap);
      }
    } catch (e) {
      console.warn("⚠️ 입고 duration 조회 실패:", e);
    }
  };

  const handleShipped = async () => {
    if (!result) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/ops/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: result.orderId, status: "SHIPPED" }),
      });
      if (res.ok) {
        setResult({ ...result, status: "SHIPPED" });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">출고 (Outbound)</h1>
        <p className="text-sm text-gray-500 mt-1">완성품 출고 및 발송 처리</p>
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
            className={`px-4 py-2 rounded text-white ${isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            조회
          </button>
        </div>
        {result && (() => {
          // 렌더링 시점에 값 추출 (순환 참조 방지)
          const orderId = result.orderId;
          const status = result.status;
          const trackingNo = result.trackingNo;
          const items = result.repairItems || [];
          const itemCount = items.length;
          
          return (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">주문번호:</span>
                  <div className="font-medium text-gray-900">{orderId}</div>
                </div>
                <div>
                  <span className="text-gray-500">현재 상태:</span>
                  <div className="font-medium text-gray-900">{status}</div>
                </div>
                <div>
                  <span className="text-gray-500">송장번호:</span>
                  <div className="font-medium text-gray-900">{trackingNo}</div>
                </div>
                <div>
                  <span className="text-gray-500">수선 아이템:</span>
                  <div className="font-medium text-purple-600">
                    {itemCount}개
                  </div>
                </div>
              </div>
              
              {/* 아이템 목록 */}
              {itemCount > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">수선 항목:</div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item, i) => {
                      const itemId = item.id;
                      const itemName = item.repairPart;
                      
                      return (
                        <span
                          key={`tag-${i}-${itemId}`}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                        >
                          <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded text-xs">
                            {i + 1}
                          </span>
                          {itemName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* 도서산간 지역 안내 */}
              {result.isIslandArea && result.islandAreaInfo && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚢</span>
                    <div>
                      <p className="text-sm font-medium text-orange-800">
                        도서산간 지역
                      </p>
                      <p className="text-xs text-orange-700">
                        {result.islandAreaInfo.region} • {result.islandAreaInfo.estimatedDays} • 추가 +{result.islandAreaInfo.additionalFee.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* 액션 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-3">
          {/* 출고 영상 촬영 - 아이템별 */}
          {result && (() => {
            // 렌더링 시점에 모든 값을 추출 (순환 참조 방지)
            const items = result.repairItems || [];
            const durations = { ...inboundDurations };
            const itemCount = items.length || Object.keys(durations).length || 1;
            
            console.log(`🎬 버튼 렌더링: ${itemCount}개 아이템`);
            
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-700">
                    출고 영상 촬영
                  </div>
                  <div className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                    {itemCount}개 아이템
                  </div>
                </div>
                
                {items.length > 0 ? (
                  // repair_items 정보가 있으면 각 아이템 이름 표시
                  items.map((item, i) => {
                    const seq = i + 1;
                    const inboundDuration = durations[seq];
                    const itemId = item.id;
                    const itemName = item.repairPart;
                    
                    return (
                    <button
                      key={`item-${seq}-${itemId}`}
                      onClick={() => {
                        console.log(`🎬 ${seq}번 촬영 시작: ${itemName}`);
                        setCurrentVideoSequence(seq);
                        setCurrentItemName(itemName);
                        setShowVideo(true);
                      }}
                      className="w-full px-6 py-3 rounded-lg font-medium flex items-center justify-between bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                    >
                        <span className="flex items-center gap-3">
                          <Video className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-bold">{seq}번 아이템 출고 촬영</div>
                            <div className="text-xs text-purple-200">{itemName}</div>
                          </div>
                        </span>
                        {inboundDuration && (
                          <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                            입고 {inboundDuration}초
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  // repair_items 정보가 없으면 기본 버튼
                  Array.from({ length: itemCount }, (_, i) => {
                    const seq = i + 1;
                    const inboundDuration = durations[seq];
                    
                    return (
                      <button
                      key={`seq-${seq}`}
                      onClick={() => {
                        console.log(`🎬 ${seq}번 촬영 시작`);
                        setCurrentVideoSequence(seq);
                        setCurrentItemName(`${seq}번 아이템`);
                        setShowVideo(true);
                      }}
                      className="w-full px-6 py-3 rounded-lg font-medium flex items-center justify-between bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                          <Video className="h-5 w-5" />
                          {seq}번 아이템 출고 촬영
                        </span>
                        {inboundDuration && (
                          <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                            입고 {inboundDuration}초
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            );
          })()}

          <button
            onClick={handleShipped}
            disabled={!result || result.status === "SHIPPED" || isProcessing}
            className={`w-full px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
              result && result.status !== "SHIPPED" && !isProcessing
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Send className="h-5 w-5" />
            {isProcessing ? "처리 중..." : "출고 처리 (SHIPPED)"}
          </button>
        </div>
      </div>

      {/* 출고 영상 다이얼로그 */}
      {showVideo && result && (() => {
        // 렌더링 시점에 값을 추출 (클로저 순환 참조 방지)
        const seq = currentVideoSequence;
        const itemName = currentItemName;
        const duration = inboundDurations[seq];
        const orderIdValue = result.orderId;
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    출고 영상 촬영 - {seq}번 아이템
                  </h2>
                  {itemName && (
                    <p className="text-sm text-purple-600 mt-1">
                      {itemName}
                    </p>
                  )}
                  {duration && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 입고 영상: {duration}초 (참고용)
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => {
                    console.log('🚪 다이얼로그 닫기');
                    setShowVideo(false);
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
                  maxDuration={duration}
                  onUploaded={(videoId, uploadDuration) => {
                    console.log(`✅ ${seq}번 업로드 완료: ${videoId}`);
                    
                    setShowVideo(false);
                    
                    setTimeout(() => {
                      alert(`✅ ${itemName || `${seq}번 아이템`} 출고 영상이 저장되었습니다.\n\n영상 길이: ${uploadDuration}초\n영상 ID: ${videoId}`);
                    }, 100);
                  }}
                  onClose={() => {
                    console.log('🚪 WebcamRecorder 닫기');
                    setShowVideo(false);
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

