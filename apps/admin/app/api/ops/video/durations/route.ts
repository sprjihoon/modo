import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/ops/video/durations?trackingNo=xxx&type=inbound_video
 * 
 * 특정 송장번호의 영상 duration 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingNo = searchParams.get("trackingNo");
    const type = searchParams.get("type");

    if (!trackingNo) {
      return NextResponse.json(
        { error: "trackingNo is required" },
        { status: 400 }
      );
    }

    const { data: videos, error } = await supabaseAdmin
      .from("media")
      .select("sequence, duration_seconds, type")
      .eq("final_waybill_no", trackingNo)
      .order("sequence", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // type 필터링 (선택사항)
    let filtered = videos || [];
    if (type) {
      filtered = filtered.filter((v) => v.type === type);
    }

    const durations = filtered.map((v) => ({
      sequence: v.sequence || 1,
      duration_seconds: v.duration_seconds || null,
      type: v.type,
    }));

    return NextResponse.json({
      success: true,
      durations,
    });
  } catch (error: any) {
    console.error("Duration 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

