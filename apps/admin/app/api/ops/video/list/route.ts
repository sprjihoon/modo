import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

/**
 * GET /api/ops/video/list?orderId=xxx&type=inbound_video
 * 
 * 주문의 영상 목록 조회 (sequence별)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get("orderId");
    const type = searchParams.get("type"); // inbound_video, outbound_video, work_video

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    // shipment에서 tracking_no 가져오기
    let trackingNumbers: string[] = [orderId];
    
    try {
      const { data: shipment } = await supabaseAdmin
        .from("shipments")
        .select("tracking_no, outbound_tracking_no, delivery_tracking_no, pickup_tracking_no")
        .eq("order_id", orderId)
        .maybeSingle();

      if (shipment) {
        const candidates = [
          shipment.pickup_tracking_no,
          shipment.delivery_tracking_no,
          shipment.outbound_tracking_no,
          shipment.tracking_no,
        ].filter(Boolean) as string[];
        
        trackingNumbers = [...new Set([...trackingNumbers, ...candidates])];
      }
    } catch (e) {
      console.warn("⚠️ shipment 조회 실패:", e);
    }

    // media 테이블에서 영상 조회
    const { data: videos, error } = await supabaseAdmin
      .from("media")
      .select("id, path, type, sequence, duration_seconds, final_waybill_no, created_at")
      .in("final_waybill_no", trackingNumbers)
      .order("sequence", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // type 필터링 (선택사항)
    let filtered = videos || [];
    if (type) {
      filtered = filtered.filter((v) => v.type === type);
    }

    // sequence별로 그룹화
    const videosBySequence: Record<number, any> = {};
    filtered.forEach((v) => {
      const seq = v.sequence || 1;
      if (!videosBySequence[seq]) {
        videosBySequence[seq] = [];
      }
      videosBySequence[seq].push({
        id: v.id,
        videoId: v.path, // Cloudflare Stream video ID
        type: v.type,
        sequence: seq,
        duration_seconds: v.duration_seconds,
        created_at: v.created_at,
      });
    });

    return NextResponse.json({
      success: true,
      videos: videosBySequence,
      allVideos: filtered,
    });
  } catch (error: any) {
    console.error("영상 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

