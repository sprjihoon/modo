import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingNo: string }> | { trackingNo: string } }
) {
  try {
    // Next.js 15+에서는 params가 Promise일 수 있음
    const resolvedParams = await Promise.resolve(params);
    const trackingNo = resolvedParams.trackingNo;

    if (!trackingNo) {
      return NextResponse.json(
        { error: "trackingNo is required" },
        { status: 400 }
      );
    }

    console.log("🔍 API Route - 송장 조회:", trackingNo);

    // shipments 테이블에서 조회 (입고/출고/배송 송장 모두 허용)
    // tracking_no: 기존 송장번호 (레거시)
    // pickup_tracking_no: 입고(수거) 송장번호
    // delivery_tracking_no: 출고(배송) 송장번호
    let resolvedShipment: any | null = null;
    let primaryError: any | null = null;
    try {
      const { data, error } = await supabaseAdmin
        .from("shipments")
        .select("*")
        .or([
          `tracking_no.eq.${trackingNo}`,
          `pickup_tracking_no.eq.${trackingNo}`,
          `delivery_tracking_no.eq.${trackingNo}`,
        ].join(","))
        .maybeSingle();
      if (error) {
        primaryError = error;
        throw error;
      }
      resolvedShipment = data;
    } catch (err: any) {
      // 스키마에 특정 컬럼이 없는 환경 대응: 축소 쿼리로 재시도
      if (String(err?.message || "").includes("does not exist")) {
        const { data: fallbackData, error: fallbackError } = await supabaseAdmin
          .from("shipments")
          .select("*")
          .or([
            `tracking_no.eq.${trackingNo}`,
            `pickup_tracking_no.eq.${trackingNo}`,
          ].join(","))
          .maybeSingle();
        if (fallbackError) {
          return NextResponse.json({ error: fallbackError.message }, { status: 500 });
        }
        resolvedShipment = fallbackData;
      } else {
        return NextResponse.json({ error: err?.message || "Query failed" }, { status: 500 });
      }
    }

    console.log("📦 Shipment 조회 결과:", { shipment: resolvedShipment, error: primaryError });

    // 기본 조회에서 못 찾은 경우: orders.tracking_no로 보조 조회 (스키마 차이 대응)
    if (!resolvedShipment) {
      const { data: orderByTracking, error: orderByTrackingError } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("tracking_no", trackingNo)
        .maybeSingle();

      if (orderByTrackingError) {
        return NextResponse.json({ error: orderByTrackingError.message }, { status: 500 });
      }

      if (orderByTracking?.id) {
        const { data: shipmentByOrder, error: shipmentByOrderError } = await supabaseAdmin
          .from("shipments")
          .select("*")
          .eq("order_id", orderByTracking.id)
          .maybeSingle();

        if (shipmentByOrderError) {
          return NextResponse.json({ error: shipmentByOrderError.message }, { status: 500 });
        }
        resolvedShipment = shipmentByOrder;
      }
    }

    if (!resolvedShipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    // orders 테이블에서 별도 조회
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", resolvedShipment.order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // delivery_info가 JSON 문자열인 경우 파싱
    let deliveryInfo = resolvedShipment.delivery_info;
    if (typeof deliveryInfo === 'string') {
      try {
        deliveryInfo = JSON.parse(deliveryInfo);
      } catch (e) {
        console.warn('⚠️ delivery_info 파싱 실패:', e);
        deliveryInfo = null;
      }
    }

    // 송장번호 확인 및 정리
    const deliveryTrackingNo = resolvedShipment.delivery_tracking_no || 
                               resolvedShipment.outbound_tracking_no || 
                               null;

    console.log('📦 Shipment 데이터 확인:', {
      delivery_tracking_no: resolvedShipment.delivery_tracking_no,
      outbound_tracking_no: resolvedShipment.outbound_tracking_no,
      tracking_no: resolvedShipment.tracking_no,
      pickup_tracking_no: resolvedShipment.pickup_tracking_no,
      delivery_info: deliveryInfo,
      delivery_info_type: typeof resolvedShipment.delivery_info,
    });

    return NextResponse.json({
      success: true,
      data: {
        shipment: {
          ...resolvedShipment,
          delivery_info: deliveryInfo, // 파싱된 delivery_info 사용
          delivery_tracking_no: deliveryTrackingNo, // 명시적으로 설정
        },
        order,
      },
    });
  } catch (error: any) {
    console.error("Shipment 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

