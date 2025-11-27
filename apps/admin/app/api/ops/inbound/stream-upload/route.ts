import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { uploadToCloudflareStream } from "@/lib/cloudflareStreamUpload";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, base64, mimeType, sequence, durationSeconds } = body as {
      orderId: string;
      base64: string;
      mimeType?: string;
      sequence?: number;
      durationSeconds?: number;
    };

    if (!orderId || !base64) {
      return NextResponse.json({ error: "orderId and base64 are required" }, { status: 400 });
    }

    // 입고 영상: pickup_tracking_no (수거 송장번호) 사용
    let finalWaybillNo = orderId;
    try {
      const { data: shipment } = await supabaseAdmin
        .from("shipments")
        .select("tracking_no, outbound_tracking_no, delivery_tracking_no, pickup_tracking_no")
        .eq("order_id", orderId)
        .maybeSingle();
      
      // 입고 단계이므로 수거 송장번호 우선
      finalWaybillNo =
        shipment?.pickup_tracking_no ||
        shipment?.tracking_no ||
        orderId;
      
      console.log("📦 입고 영상 final_waybill_no:", finalWaybillNo);
    } catch (e) {
      console.error("❌ shipment 조회 실패:", e);
    }

    const buffer = Buffer.from(base64, "base64");
    const blob = new Blob([buffer], { type: mimeType || "video/webm" });

    const videoId = await uploadToCloudflareStream(
      blob, 
      finalWaybillNo, 
      "inbound_video",
      sequence || 1,
      durationSeconds
    );
    return NextResponse.json({ success: true, videoId, duration: durationSeconds });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Stream upload failed" }, { status: 500 });
  }
}


