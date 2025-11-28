import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    console.log("🎬 [API] 영상 조회 시작");
    
    const { data: videos, error } = await supabaseAdmin
      .from("media")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("🎬 [API] Supabase 에러:", error);
      throw new Error(error.message);
    }

    // 모든 shipments를 한 번에 가져오기 (성능 최적화)
    const { data: allShipments } = await supabaseAdmin
      .from("shipments")
      .select("order_id, pickup_tracking_no, delivery_tracking_no");

    // final_waybill_no를 키로 하는 맵 생성
    const shipmentMap = new Map();
    (allShipments || []).forEach((shipment) => {
      // order_id로 매핑
      if (shipment.order_id) {
        shipmentMap.set(shipment.order_id, {
          pickup_tracking_no: shipment.pickup_tracking_no,
          delivery_tracking_no: shipment.delivery_tracking_no,
        });
      }
      // pickup_tracking_no로도 매핑
      if (shipment.pickup_tracking_no) {
        shipmentMap.set(shipment.pickup_tracking_no, {
          pickup_tracking_no: shipment.pickup_tracking_no,
          delivery_tracking_no: shipment.delivery_tracking_no,
        });
      }
      // delivery_tracking_no로도 매핑
      if (shipment.delivery_tracking_no) {
        shipmentMap.set(shipment.delivery_tracking_no, {
          pickup_tracking_no: shipment.pickup_tracking_no,
          delivery_tracking_no: shipment.delivery_tracking_no,
        });
      }
    });

    // 영상에 송장번호 정보 추가
    const videosWithShipment = (videos || []).map((video) => {
      const shipmentInfo = shipmentMap.get(video.final_waybill_no);
      return {
        ...video,
        pickup_tracking_no: shipmentInfo?.pickup_tracking_no,
        delivery_tracking_no: shipmentInfo?.delivery_tracking_no,
      };
    });

    console.log("🎬 [API] 조회 결과:", {
      count: videosWithShipment.length,
      sample: videosWithShipment[0]
    });

    return NextResponse.json({
      success: true,
      videos: videosWithShipment,
    });
  } catch (error: any) {
    console.error("🎬 [API] 영상 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

