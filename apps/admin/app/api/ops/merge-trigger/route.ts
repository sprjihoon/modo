import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/ops/merge-trigger
 * 
 * 입고+출고 영상이 모두 있으면 병합 Worker를 호출하여 merged_video 생성
 * 
 * Body: { finalWaybillNo: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { finalWaybillNo } = body;

    if (!finalWaybillNo) {
      return NextResponse.json(
        { error: "finalWaybillNo is required" },
        { status: 400 }
      );
    }

    console.log("🔄 병합 트리거 시작:", finalWaybillNo);

    // 1) media 테이블에서 입고/출고 영상 조회
    const { data: videos, error: videoError } = await supabaseAdmin
      .from("media")
      .select("*")
      .eq("final_waybill_no", finalWaybillNo)
      .in("type", ["inbound_video", "outbound_video"]);

    if (videoError) {
      throw new Error(videoError.message);
    }

    const inboundVideo = videos?.find((v) => v.type === "inbound_video");
    const outboundVideo = videos?.find((v) => v.type === "outbound_video");

    if (!inboundVideo || !outboundVideo) {
      return NextResponse.json(
        { error: "입고 또는 출고 영상이 없습니다" },
        { status: 404 }
      );
    }

    // 2) Cloudflare Stream URL 생성
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!accountId) {
      throw new Error("CLOUDFLARE_ACCOUNT_ID not configured");
    }

    const inboundUrl = `https://customer-${accountId}.cloudflarestream.com/${inboundVideo.path}/downloads/default.mp4`;
    const outboundUrl = `https://customer-${accountId}.cloudflarestream.com/${outboundVideo.path}/downloads/default.mp4`;

    console.log("📹 입고 영상:", inboundUrl);
    console.log("📹 출고 영상:", outboundUrl);

    // 3) 병합 Worker 호출
    const workerUrl = process.env.MERGE_WORKER_URL || "https://merge-video-worker.your-account.workers.dev/merge";
    
    console.log("🔧 병합 Worker 호출:", workerUrl);

    const mergeResponse = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        finalWaybillNo,
        inboundVideoUrl: inboundUrl,
        outboundVideoUrl: outboundUrl,
      }),
    });

    if (!mergeResponse.ok) {
      const errorText = await mergeResponse.text();
      throw new Error(`병합 Worker 실패: ${mergeResponse.status} ${errorText}`);
    }

    const mergeResult = await mergeResponse.json();
    console.log("✅ 병합 완료:", mergeResult);

    // 4) media 테이블에 merged_video insert
    const { error: insertError } = await supabaseAdmin
      .from("media")
      .insert({
        final_waybill_no: finalWaybillNo,
        type: "merged_video",
        provider: "r2", // R2에 저장된 경우
        path: mergeResult.mergedPath,
      });

    if (insertError) {
      console.error("❌ media insert 실패:", insertError);
      throw new Error(insertError.message);
    }

    return NextResponse.json({
      success: true,
      message: "병합 완료",
      mergedPath: mergeResult.mergedPath,
    });
  } catch (error: any) {
    console.error("❌ 병합 트리거 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

