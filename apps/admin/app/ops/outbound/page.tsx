
"use client";

import { useState } from "react";
import { Send, Video, Package, RotateCcw, CheckCircle, AlertTriangle, Printer, ExternalLink } from "lucide-react";
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
  // 배송지 변경 추적
  deliveryAddressUpdatedAt?: string | null;   // 고객이 배송지를 변경한 시각
  deliveryTrackingCreatedAt?: string | null;  // 출고 송장이 생성된 시각
  deliveryTrackingNo?: string | null;         // 출고 송장번호 (재출력 판단용)
  addressChangedAfterLabel?: boolean;         // 송장 생성 후 배송지 변경 여부
};

export default function OutboundPage() {
  const [trackingNo, setTrackingNo] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showPackingVideo, setShowPackingVideo] = useState(false); // 포장 완료 영상
  const [currentVideoSequence, setCurrentVideoSequence] = useState<number>(1);
  const [currentItemName, setCurrentItemName] = useState<string>(""); // 촬영 중인 아이템 이름
  const [inboundDurations, setInboundDurations] = useState<Record<number, number>>({});
  const [outboundVideos, setOutboundVideos] = useState<Record<number, { videoId: string; id: string }>>({});
  const [packingVideo, setPackingVideo] = useState<{ videoId: string; id: string } | null>(null); // 포장 영상

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
      // repair_parts가 객체/JSON 문자열 혼재일 수 있어 사람이 읽을 수 있는 부위명으로 정규화
      const normalizePart = (raw: unknown): string => {
        if (raw == null) return "";
        if (typeof raw === "string") {
          const s = raw.trim();
          if (s.startsWith("{")) {
            try {
              const obj = JSON.parse(s) as { name?: string; quantity?: number };
              const qty = (obj.quantity ?? 1) > 1 ? ` ×${obj.quantity}` : "";
              return `${obj.name ?? s}${qty}`;
            } catch {
              return s;
            }
          }
          return s;
        }
        if (typeof raw === "object") {
          const obj = raw as { name?: string; quantity?: number };
          const qty = (obj.quantity ?? 1) > 1 ? ` ×${obj.quantity}` : "";
          return `${obj.name ?? ""}${qty}`;
        }
        return String(raw);
      };
      const repairParts: string[] = repairPartsCount > 0
        ? (orderData.repair_parts as unknown[]).map(normalizePart).filter(Boolean)
        : [];
      
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

      // 배송지 변경 / 송장 재출력 판단
      const deliveryAddressUpdatedAt = orderData?.delivery_address_updated_at
        ? String(orderData.delivery_address_updated_at)
        : null;
      const deliveryTrackingCreatedAt = shipmentData?.delivery_tracking_created_at
        ? String(shipmentData.delivery_tracking_created_at)
        : null;
      const deliveryTrackingNo = shipmentData?.delivery_tracking_no
        ? String(shipmentData.delivery_tracking_no)
        : null;

      // 출고 송장이 이미 존재하고, 그 이후에 배송지가 변경되었으면 재출력 필요
      let addressChangedAfterLabel = false;
      if (deliveryAddressUpdatedAt && deliveryTrackingNo) {
        if (deliveryTrackingCreatedAt) {
          addressChangedAfterLabel =
            new Date(deliveryAddressUpdatedAt) > new Date(deliveryTrackingCreatedAt);
        } else {
          // delivery_tracking_created_at 이 없으면 보수적으로 경고
          addressChangedAfterLabel = true;
        }
      }

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
        deliveryAddressUpdatedAt,
        deliveryTrackingCreatedAt,
        deliveryTrackingNo,
        addressChangedAfterLabel,
      };
      
      console.log(`✅ 주문 조회 완료: ${parsedItems.length}개 아이템`);
      
      // state 업데이트 (완전히 새로운 객체)
      setResult(found);
      
      // 입고 영상 duration 조회
      const pickupTrackingNo = shipmentData.pickup_tracking_no || shipmentData.tracking_no;
      await loadInboundDurations(pickupTrackingNo);
      
      // 출고 영상 조회
      await loadOutboundVideos(found.orderId);
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

  // 출고 영상 조회
  const loadOutboundVideos = async (orderId: string) => {
    try {
      // 출고 영상 조회
      const res = await fetch(`/api/ops/video/list?orderId=${encodeURIComponent(orderId)}&type=outbound_video`);
      const json = await res.json();
      if (res.ok && json.success && json.videos) {
        const videosMap: Record<number, { videoId: string; id: string }> = {};
        Object.entries(json.videos).forEach(([seqStr, videos]: [string, any]) => {
          const seq = parseInt(seqStr);
          if (Array.isArray(videos) && videos.length > 0) {
            // 가장 최근 영상 사용
            const latestVideo = videos[videos.length - 1];
            videosMap[seq] = {
              videoId: latestVideo.videoId,
              id: latestVideo.id,
            };
          }
        });
        setOutboundVideos(videosMap);
        console.log("✅ 출고 영상 조회 완료:", videosMap);
      }

      // 포장 영상 조회 (별도 타입)
      const packingRes = await fetch(`/api/ops/video/list?orderId=${encodeURIComponent(orderId)}&type=packing_video`);
      const packingJson = await packingRes.json();
      if (packingRes.ok && packingJson.success && packingJson.videos) {
        // sequence 0인 포장 영상 찾기
        const packingVideos = packingJson.videos["0"] || [];
        if (Array.isArray(packingVideos) && packingVideos.length > 0) {
          const latestPacking = packingVideos[packingVideos.length - 1];
          setPackingVideo({
            videoId: latestPacking.videoId,
            id: latestPacking.id,
          });
          console.log("✅ 포장 영상 조회 완료:", latestPacking.videoId);
        }
      }
    } catch (error) {
      console.error("출고 영상 조회 실패:", error);
    }
  };

  // 출고완료 처리 (포장 완료, 송장 부착 완료)
  const handleReadyToShip = async () => {
    if (!result) return;

    // ⛔ 배송지 변경 후 송장 재출력 미완료 시 차단
    if (result.addressChangedAfterLabel) {
      alert(
        "⛔ 출고 처리 불가\n\n" +
        "고객이 배송 주소를 변경했습니다.\n" +
        "기존 송장으로는 출고할 수 없습니다.\n\n" +
        "📌 조치 방법:\n" +
        "1. 주문 상세 페이지에서 송장을 재출력하세요\n" +
        "2. 새 송장으로 교체 후 출고완료 처리하세요\n\n" +
        `변경된 배송지: ${result.deliveryAddress || '-'}`
      );
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/ops/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: result.orderId, status: "READY_TO_SHIP" }),
      });
      if (res.ok) {
        setResult({ ...result, status: "READY_TO_SHIP" });
        alert("✅ 출고완료 처리되었습니다.\n포장 및 송장 부착이 완료되었습니다.");
      } else {
        const json = await res.json();
        alert(`❌ 처리 실패: ${json.error || "알 수 없는 오류"}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 발송 처리 (택배 인계 완료)
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
        alert("✅ 발송 처리되었습니다.\n택배사에 인계 완료되었습니다.");
      } else {
        const json = await res.json();
        alert(`❌ 처리 실패: ${json.error || "알 수 없는 오류"}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 출고 취소 (되돌리기)
  const handleOutboundRevert = async () => {
    if (!result) return;
    
    // 현재 상태에 따라 되돌릴 상태 결정
    let revertStatus: string;
    let confirmMessage: string;
    
    if (result.status === "SHIPPED") {
      revertStatus = "READY_TO_SHIP";
      confirmMessage = "발송 처리를 취소하고 출고완료(READY_TO_SHIP) 상태로 되돌리시겠습니까?";
    } else if (result.status === "READY_TO_SHIP") {
      revertStatus = "PROCESSING";
      confirmMessage = "출고완료 처리를 취소하고 작업중(PROCESSING) 상태로 되돌리시겠습니까?";
    } else {
      alert("되돌릴 수 없는 상태입니다.");
      return;
    }
    
    if (!confirm(confirmMessage)) return;
    
    setIsProcessing(true);
    try {
      const res = await fetch("/api/ops/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: result.orderId, status: revertStatus }),
      });
      if (res.ok) {
        setResult({ ...result, status: revertStatus });
        alert(`✅ ${revertStatus} 상태로 되돌렸습니다.`);
      } else {
        const json = await res.json();
        alert(`❌ 되돌리기 실패: ${json.error || "알 수 없는 오류"}`);
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
          const addressChanged = result.addressChangedAfterLabel;
          
          return (
            <div className="mt-4 space-y-3">
              {/* ⚠️ 배송지 변경 경고 배너 */}
              {addressChanged && (
                <div className="p-4 bg-red-50 border-2 border-red-400 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-red-800 text-base">
                        ⛔ 송장 재출력 필요 — 출고 처리 불가
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        고객이 <strong>배송 주소를 변경</strong>했습니다.
                        기존 출고 송장의 주소와 다르므로 그대로 출고할 수 없습니다.
                      </p>
                      {result.deliveryAddress && (
                        <p className="text-sm text-red-700 mt-1">
                          📍 변경된 배송지: <strong>{result.deliveryAddress}</strong>
                          {result.deliveryZipcode && ` (${result.deliveryZipcode})`}
                        </p>
                      )}
                      {result.deliveryAddressUpdatedAt && (
                        <p className="text-xs text-red-500 mt-1">
                          변경 시각: {new Date(result.deliveryAddressUpdatedAt).toLocaleString("ko-KR")}
                        </p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <a
                          href={`/dashboard/orders/${orderId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                          주문 상세에서 송장 재출력
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <p className="text-xs text-red-500 mt-2">
                        송장 재출력 후 새 송장을 박스에 부착하고 출고완료 처리하세요.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-lg">
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
                  {result.deliveryAddress && (
                    <div className="col-span-2">
                      <span className="text-gray-500">배송지:</span>
                      <div className={`font-medium text-sm mt-0.5 ${addressChanged ? "text-red-700 font-bold" : "text-gray-900"}`}>
                        {result.deliveryZipcode && `[${result.deliveryZipcode}] `}
                        {result.deliveryAddress}
                        {addressChanged && (
                          <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded font-bold">
                            주소 변경됨
                          </span>
                        )}
                      </div>
                    </div>
                  )}
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
            </div>
          );
        })()}
      </div>

      {/* 액션 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">처리 옵션</h2>
        
        <div className="space-y-3">
          {/* 포장 완료 영상 촬영 */}
          <button
            disabled={!result}
            onClick={() => setShowPackingVideo(true)}
            className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              result
                ? packingVideo
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-orange-600 text-white hover:bg-orange-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {packingVideo ? (
              <>
                <span className="text-lg">✅</span>
                포장 완료 영상 재촬영
              </>
            ) : (
              <>
                <Package className="h-5 w-5" />
                📦 포장 완료 영상 촬영
              </>
            )}
          </button>

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
                    const existingVideo = outboundVideos[seq];
                    const hasVideo = !!existingVideo;
                    
                    return (
                    <button
                      key={`item-${seq}-${itemId}`}
                      onClick={() => {
                        console.log(`🎬 ${seq}번 촬영 시작: ${itemName}`);
                        setCurrentVideoSequence(seq);
                        setCurrentItemName(itemName);
                        setShowVideo(true);
                      }}
                      className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-between transition-colors ${
                        hasVideo
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-purple-600 text-white hover:bg-purple-700"
                      }`}
                    >
                        <span className="flex items-center gap-3">
                          {hasVideo ? <span className="text-lg">✅</span> : <Video className="h-5 w-5" />}
                          <div className="text-left">
                            <div className="font-bold">{seq}번 아이템 출고 {hasVideo ? "재촬영" : "촬영"}</div>
                            <div className="text-xs opacity-80">{itemName}</div>
                          </div>
                        </span>
                        <div className="flex items-center gap-2">
                          {hasVideo && (
                            <span className="text-xs bg-white/20 px-2 py-1 rounded">
                              촬영 완료
                            </span>
                          )}
                          {inboundDuration && (
                            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                              입고 {inboundDuration}초
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  // repair_items 정보가 없으면 기본 버튼
                  Array.from({ length: itemCount }, (_, i) => {
                    const seq = i + 1;
                    const inboundDuration = durations[seq];
                    const existingVideo = outboundVideos[seq];
                    const hasVideo = !!existingVideo;
                    
                    return (
                      <button
                      key={`seq-${seq}`}
                      onClick={() => {
                        console.log(`🎬 ${seq}번 촬영 시작`);
                        setCurrentVideoSequence(seq);
                        setCurrentItemName(`${seq}번 아이템`);
                        setShowVideo(true);
                      }}
                      className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-between transition-colors ${
                        hasVideo
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-purple-600 text-white hover:bg-purple-700"
                      }`}
                    >
                        <span className="flex items-center gap-2">
                          {hasVideo ? <span className="text-lg">✅</span> : <Video className="h-5 w-5" />}
                          {seq}번 아이템 출고 {hasVideo ? "재촬영" : "촬영"}
                        </span>
                        <div className="flex items-center gap-2">
                          {hasVideo && (
                            <span className="text-xs bg-white/20 px-2 py-1 rounded">
                              촬영 완료
                            </span>
                          )}
                          {inboundDuration && (
                            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                              입고 {inboundDuration}초
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            );
          })()}

          {/* 출고완료 처리 (포장 완료, 송장 부착) */}
          <button
            onClick={handleReadyToShip}
            disabled={!result || result.status === "READY_TO_SHIP" || result.status === "SHIPPED" || isProcessing}
            className={`w-full px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
              result && result.status !== "READY_TO_SHIP" && result.status !== "SHIPPED" && !isProcessing
                ? result.addressChangedAfterLabel
                  ? "bg-red-100 text-red-700 border-2 border-red-400 cursor-pointer hover:bg-red-200"
                  : "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {result?.addressChangedAfterLabel ? (
              <>
                <AlertTriangle className="h-5 w-5" />
                {isProcessing ? "처리 중..." : "출고 불가 — 송장 재출력 필요"}
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                {isProcessing ? "처리 중..." : "출고완료 (포장 + 송장 부착)"}
              </>
            )}
          </button>

          {/* 발송 처리 (택배 인계) */}
          <button
            onClick={handleShipped}
            disabled={!result || result.status !== "READY_TO_SHIP" || isProcessing}
            className={`w-full px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
              result && result.status === "READY_TO_SHIP" && !isProcessing
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Send className="h-5 w-5" />
            {isProcessing ? "처리 중..." : "발송 처리 (택배 인계)"}
          </button>

          {/* 출고 취소 (되돌리기) */}
          <button
            onClick={handleOutboundRevert}
            disabled={!result || (result.status !== "READY_TO_SHIP" && result.status !== "SHIPPED") || isProcessing}
            className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              result && (result.status === "READY_TO_SHIP" || result.status === "SHIPPED") && !isProcessing
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <RotateCcw className="h-5 w-5" />
            {isProcessing ? "처리 중..." : "출고 취소 (되돌리기)"}
          </button>
        </div>

        {/* 상태 안내 */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          {!result
            ? "송장을 스캔하면 버튼이 활성화됩니다"
            : result.status === "SHIPPED"
              ? "발송 완료 상태입니다. 되돌리기로 이전 상태로 변경할 수 있습니다."
              : result.status === "READY_TO_SHIP"
                ? "출고완료 상태입니다. 택배 인계 후 발송 처리해주세요."
                : "포장 완료 후 출고완료 버튼을 클릭하세요."}
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
                  existingVideoId={outboundVideos[seq]?.videoId}
                  onUploaded={(videoId, uploadDuration) => {
                    console.log(`✅ ${seq}번 업로드 완료: ${videoId}`);
                    
                    setShowVideo(false);
                    
                    // 영상 목록 새로고침
                    if (result) {
                      loadOutboundVideos(result.orderId);
                    }
                    
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

      {/* 포장 완료 영상 촬영 다이얼로그 */}
      {showPackingVideo && result && (() => {
        const orderIdValue = result.orderId;
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold">📦 포장 완료 영상 촬영</h2>
                <button 
                  onClick={() => {
                    console.log('🚪 포장 영상 다이얼로그 닫기');
                    setShowPackingVideo(false);
                  }} 
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                >
                  닫기
                </button>
              </div>
              <div className="p-4">
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    📦 <strong>포장 완료 영상</strong>은 고객에게 발송 전 포장 상태를 확인할 수 있도록 촬영하는 영상입니다.<br />
                    포장된 박스 전체가 보이도록 촬영해주세요.
                  </p>
                </div>
                <WebcamRecorder
                  orderId={orderIdValue}
                  sequence={0}
                  existingVideoId={packingVideo?.videoId}
                  onUploaded={(videoId, duration) => {
                    console.log(`✅ 포장 완료 영상 업로드 완료: ${videoId}`);
                    
                    setShowPackingVideo(false);
                    
                    // 영상 목록 새로고침
                    if (result) {
                      loadOutboundVideos(result.orderId);
                    }
                    
                    setTimeout(() => {
                      alert(`✅ 포장 완료 영상이 저장되었습니다.\n\n영상 길이: ${duration}초\n영상 ID: ${videoId}`);
                    }, 100);
                  }}
                  onClose={() => {
                    console.log('🚪 포장 WebcamRecorder 닫기');
                    setShowPackingVideo(false);
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

