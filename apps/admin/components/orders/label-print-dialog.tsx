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
import { Printer, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShippingLabelSheet, type ShippingLabelData } from "@/components/ops/shipping-label-sheet";

interface LabelPrintDialogProps {
  trackingNo: string;
  type: "pickup" | "delivery" | "return";
  orderId: string;
}

export function LabelPrintDialog({ trackingNo, type, orderId }: LabelPrintDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [labelLayout, setLabelLayout] = useState<any[] | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [shipmentData, setShipmentData] = useState<any>(null);
  const [labelData, setLabelData] = useState<ShippingLabelData | null>(null);

  // 레이아웃 및 회사 정보 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        // 레이아웃 로드
        const layoutResponse = await fetch("/api/admin/settings/label-layout");
        const layoutData = await layoutResponse.json();
        if (layoutData.success && layoutData.layout) {
          setLabelLayout(layoutData.layout);
        }

        // 회사 정보 로드
        const companyResponse = await fetch("/api/admin/settings/company-info");
        const companyData = await companyResponse.json();
        if (companyData.success && companyData.data) {
          setCompanyInfo(companyData.data);
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      }
    };
    loadData();
  }, []);

  // 다이얼로그가 열릴 때 주문 및 배송 정보 로드
  useEffect(() => {
    if (open && !orderData) {
      loadOrderData();
    }
  }, [open]);

  const loadOrderData = async () => {
    setLoading(true);
    setError("");

    try {
      console.log(`🔍 [LabelPrint] 데이터 로드 시작:`, { orderId, trackingNo, type });
      
      // 주문 정보 조회
      const orderResponse = await fetch(`/api/orders/${orderId}`, {
        cache: 'no-store', // Prevent caching issues
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      console.log(`📡 [LabelPrint] 주문 API 응답:`, orderResponse.status, orderResponse.statusText);
      
      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error(`❌ [LabelPrint] 주문 API 오류:`, orderResponse.status, errorText);
        throw new Error(`주문 정보를 불러올 수 없습니다. (${orderResponse.status})`);
      }
      
      const responseText = await orderResponse.text();
      let orderResult;
      
      try {
        orderResult = JSON.parse(responseText);
      } catch (jsonError) {
        console.error(`❌ [LabelPrint] JSON 파싱 실패:`, responseText);
        throw new Error("서버 응답을 처리할 수 없습니다.");
      }
      
      if (!orderResult.success || !orderResult.order) {
        throw new Error("주문 정보가 없습니다.");
      }
      console.log('✅ [LabelPrint] 주문 정보 로드 완료:', orderResult.order);
      setOrderData(orderResult.order);

      // 배송 정보 조회 (shipment)
      // trackingNo를 사용하여 shipment 조회
      console.log(`🔍 [LabelPrint] Shipment 조회 시작: ${trackingNo}`);
      const shipmentResponse = await fetch(`/api/ops/shipments/${trackingNo}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (shipmentResponse.ok) {
        const shipmentResult = await shipmentResponse.json();
        console.log('✅ [LabelPrint] Shipment 조회 성공:', shipmentResult);
        
        if (shipmentResult.success && shipmentResult.data) {
          setShipmentData(shipmentResult.data.shipment);
          
          // 송장 데이터 생성
          await buildLabelData(orderResult.order, shipmentResult.data.shipment, shipmentResult.data.order);
        } else {
          console.warn('⚠️ [LabelPrint] Shipment 데이터 없음 - 주문 정보로 생성');
          await buildLabelData(orderResult.order, null, null);
        }
      } else {
        // shipment 정보가 없어도 주문 정보만으로 라벨 생성 (집배코드는 재조회로 획득)
        console.log('ℹ️ [LabelPrint] Shipment 미조회 - 주문 정보와 집배코드 재조회로 송장 생성');
        await buildLabelData(orderResult.order, null, null);
      }
    } catch (err: any) {
      console.error("❌ [LabelPrint] 주문 정보 로드 실패:", err);
      setError(err.message || "주문 정보를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const buildLabelData = async (order: any, shipment: any, fullOrder: any) => {
    try {
      console.log('🔍 [LabelPrint] buildLabelData 시작:', { order, shipment, fullOrder });
      
      // delivery_info 파싱
      let deliveryInfo = shipment?.delivery_info;
      console.log('🔍 [LabelPrint] 원본 deliveryInfo:', deliveryInfo);
      
      if (deliveryInfo && typeof deliveryInfo === 'string') {
        try {
          deliveryInfo = JSON.parse(deliveryInfo);
          console.log('✅ [LabelPrint] deliveryInfo 파싱 성공:', deliveryInfo);
        } catch (e) {
          console.warn('⚠️ [LabelPrint] deliveryInfo 파싱 실패:', e);
          deliveryInfo = null;
        }
      }

      // deliveryInfo 검증
      const hasDeliveryInfo = deliveryInfo && 
                             typeof deliveryInfo === 'object' && 
                             Object.keys(deliveryInfo).length > 0;
      
      const hasRealData = hasDeliveryInfo && (
        deliveryInfo.sortCode1 || 
        deliveryInfo.sortCode2 || 
        deliveryInfo.sortCode3 || 
        deliveryInfo.sortCode4 ||
        deliveryInfo.delivAreaCd || 
        deliveryInfo.courseNo ||
        deliveryInfo.arrCnpoNm ||
        deliveryInfo.delivPoNm ||
        deliveryInfo.printAreaCd
      );

      console.log('🔍 [LabelPrint] deliveryInfo 검증:', {
        hasDeliveryInfo,
        hasRealData,
        sortCode1: deliveryInfo?.sortCode1,
        sortCode2: deliveryInfo?.sortCode2,
        sortCode3: deliveryInfo?.sortCode3,
        sortCode4: deliveryInfo?.sortCode4,
        delivAreaCd: deliveryInfo?.delivAreaCd,
        courseNo: deliveryInfo?.courseNo,
        arrCnpoNm: deliveryInfo?.arrCnpoNm,
        delivPoNm: deliveryInfo?.delivPoNm,
        printAreaCd: deliveryInfo?.printAreaCd,
      });

      if (!hasRealData) {
        console.warn('⚠️ [LabelPrint] 집배코드 정보 없음 - 재조회 시도...');
        
        // 집배코드 재조회 API 호출
        try {
          const updateResponse = await fetch('/api/shipments/update-delivery-code', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              trackingNo: trackingNo,
              orderId: order.id,
            }),
          });

          if (updateResponse.ok) {
            const updateResult = await updateResponse.json();
            if (updateResult.success && updateResult.deliveryCodeInfo) {
              console.log('✅ [LabelPrint] 집배코드 재조회 성공:', updateResult.deliveryCodeInfo);
              deliveryInfo = { ...deliveryInfo, ...updateResult.deliveryCodeInfo };
              
              // 재검증
              const hasRealDataAfterUpdate = 
                deliveryInfo.sortCode1 || 
                deliveryInfo.sortCode2 || 
                deliveryInfo.sortCode3 || 
                deliveryInfo.sortCode4 ||
                deliveryInfo.delivAreaCd || 
                deliveryInfo.courseNo ||
                deliveryInfo.arrCnpoNm ||
                deliveryInfo.delivPoNm ||
                deliveryInfo.printAreaCd;
              
              if (hasRealDataAfterUpdate) {
                console.log('✅ [LabelPrint] 재조회 후 집배코드 확인:', {
                  sortCode1: deliveryInfo.sortCode1,
                  sortCode2: deliveryInfo.sortCode2,
                  sortCode3: deliveryInfo.sortCode3,
                  sortCode4: deliveryInfo.sortCode4,
                });
              }
            }
          } else {
            console.error('❌ [LabelPrint] 집배코드 재조회 실패:', await updateResponse.text());
          }
        } catch (updateError: any) {
          console.error('❌ [LabelPrint] 집배코드 재조회 오류:', updateError);
        }
      }

      // delivAreaCd가 없으면 courseNo에서 변환
      if (!deliveryInfo?.delivAreaCd && deliveryInfo?.courseNo) {
        deliveryInfo.delivAreaCd = `-${deliveryInfo.courseNo}-`;
      }

      // delivAreaCd 정리
      if (deliveryInfo?.delivAreaCd) {
        const cleanDelivAreaCd = deliveryInfo.delivAreaCd.trim();
        if (/^[\d-]+$/.test(cleanDelivAreaCd.replace(/-/g, ''))) {
          if (!cleanDelivAreaCd.includes('-')) {
            deliveryInfo.delivAreaCd = `-${cleanDelivAreaCd}-`;
          } else {
            deliveryInfo.delivAreaCd = cleanDelivAreaCd;
          }
        } else {
          console.warn('⚠️ [LabelPrint] 잘못된 delivAreaCd 형식:', deliveryInfo.delivAreaCd);
          deliveryInfo.delivAreaCd = '';
        }
      }

      // 회사 정보
      const companyAddress = companyInfo?.address || "대구 동구 동촌로 1 동대구우체국";
      const companyName = companyInfo?.company_name?.split('(')[0].trim() || "모두의수선";
      const companyPhone = companyInfo?.phone || "010-2723-9490";

      // 고객 주소 정보
      const isSameAddress = order.is_pickup_delivery_same !== false && order.is_same_address !== false;
      const pickupAddr = [order.pickup_address, order.pickup_address_detail].filter(Boolean).join(" ");
      const deliveryAddr = [order.delivery_address, order.delivery_address_detail].filter(Boolean).join(" ");
      const customerAddress = isSameAddress ? pickupAddr : deliveryAddr;
      const customerZipcode = isSameAddress ? order.pickup_zipcode : order.delivery_zipcode;

      // 반송인 경우: 회사 → 고객 (보내는 사람이 회사, 받는 사람이 고객)
      // 배송/수거인 경우: 회사 → 고객 (동일하게 처리)
      const senderAddress = type === 'return' ? companyAddress : companyAddress;
      const senderName = type === 'return' ? companyName : companyName;
      const senderPhone = type === 'return' ? companyPhone : companyPhone;
      const recipientAddress = type === 'return' ? customerAddress : customerAddress;
      const recipientZipcode = type === 'return' ? customerZipcode : customerZipcode;

      console.log(`🏢 [LabelPrint] ${type === 'return' ? '반송' : '배송'} 송장 정보:`, {
        senderAddress,
        senderName,
        senderPhone,
        recipientAddress,
        recipientZipcode,
      });

      // 주문일 포맷팅
      const formatOrderDate = (dateString?: string) => {
        if (!dateString) return new Date().toLocaleDateString('ko-KR');
        return new Date(dateString).toLocaleDateString('ko-KR');
      };

      // 수선 항목 리스트
      const repairParts = Array.isArray(fullOrder?.repair_parts) ? fullOrder.repair_parts : 
                         Array.isArray(order?.repair_parts) ? order.repair_parts : [];
      const itemsList = repairParts.length > 0
        ? repairParts.map((part: string, idx: number) => `${idx + 1}. ${part}`).join('\n')
        : order.item_name || "거래물품";

      console.log('📦 [LabelPrint] 상품 정보:', { repairParts, itemsList });

      const data: ShippingLabelData = {
        trackingNo: trackingNo,
        
        // 주문 정보
        orderDate: formatOrderDate(order.created_at),
        recipientName: order.customer_name || "고객명",
        sellerName: senderName,
        orderNumber: deliveryInfo?.resNo?.substring(deliveryInfo.resNo.length - 6) || orderId.substring(0, 6),
        customerOrderSource: senderName,
        
        // 보내는 분
        senderAddress: senderAddress,
        senderName: senderName,
        senderPhone: senderPhone,
        
        // 받는 분
        recipientZipcode: recipientZipcode || "",
        recipientAddress: recipientAddress,
        recipientPhone: order.customer_phone || "",
        
        // 상품 정보
        totalQuantity: repairParts.length || 1,
        itemsList: itemsList,
        memo: type === 'return' 
          ? `[반송] ${order.item_name || '수선 의류'}` 
          : (order.item_description || order.item_name),
        
        // 기타
        weight: fullOrder?.weight ? `${fullOrder.weight}kg` : "2kg",
        volume: fullOrder?.volume ? `${fullOrder.volume}cm` : "60cm",
        
        // 우체국 분류 코드 (deliveryInfo가 있으면 사용)
        deliveryPlaceCode: deliveryInfo?.arrCnpoNm || "",
        deliveryTeamCode: deliveryInfo?.delivPoNm || "",
        deliverySequence: (() => {
          let seq = deliveryInfo?.delivAreaCd || (deliveryInfo?.courseNo ? `-${deliveryInfo.courseNo}-` : "");
          // 잘못된 형식 필터링
          if (seq && (seq.includes('경') || seq.includes('A') || seq.includes('부') || seq.includes('광') || seq.includes('충'))) {
            console.warn('⚠️ [LabelPrint] deliverySequence에 잘못된 값 감지:', seq);
            seq = '';
          }
          if (seq && !seq.includes('-') && /^\d+$/.test(seq)) {
            seq = `-${seq}-`;
          }
          return seq;
        })(),
        
        // 집배코드 상세
        sortCode1: deliveryInfo?.sortCode1 || "",
        sortCode2: deliveryInfo?.sortCode2 || "",
        sortCode3: deliveryInfo?.sortCode3 || "",
        sortCode4: deliveryInfo?.sortCode4 || "",
        printAreaCd: deliveryInfo?.printAreaCd || "",
      };

      console.log('📋 [LabelPrint] 최종 송장 데이터:', data);
      setLabelData(data);
    } catch (err: any) {
      console.error("❌ [LabelPrint] 송장 데이터 생성 실패:", err);
      setError("송장 데이터를 생성할 수 없습니다.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Printer className="h-3 w-3 mr-1" />
            출력
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {type === 'pickup' ? '수거' : type === 'return' ? '반송' : '배송'} 송장 출력
            </DialogTitle>
            <DialogDescription>
              {type === 'return' 
                ? '고객에게 반송할 물품의 송장을 출력합니다.'
                : '운송장을 출력하거나 확인할 수 있습니다.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">송장 정보 로딩 중...</span>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!loading && !error && labelData && (
              <div className="space-y-4">
                <div className="text-sm space-y-2 bg-muted p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">운송장번호:</span>
                    <span className="font-mono font-bold">{trackingNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">유형:</span>
                    <span className="font-medium">
                      {type === 'pickup' ? '수거용' : type === 'return' ? '반송용' : '배송용'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">고객명:</span>
                    <span className="font-medium">{labelData.recipientName}</span>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-white">
                  <h3 className="text-sm font-semibold mb-3">송장 미리보기</h3>
                  <div className="flex justify-center print:block">
                    <ShippingLabelSheet
                      data={labelData}
                      customLayout={labelLayout || undefined}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              취소
            </Button>
            <Button onClick={handlePrint} disabled={loading || !labelData}>
              <Printer className="h-4 w-4 mr-2" />
              인쇄하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ShippingLabelSheet 컴포넌트에 print 스타일이 내장되어 있음 */}
    </>
  );
}

