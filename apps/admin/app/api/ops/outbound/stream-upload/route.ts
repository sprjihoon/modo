import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { uploadToCloudflareStream } from "@/lib/cloudflareStreamUpload";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, base64, mimeType } = body as {
      orderId: string;
      base64: string;
      mimeType?: string;
    };

    if (!orderId || !base64) {
      return NextResponse.json({ error: "orderId and base64 are required" }, { status: 400 });
    }

    // Try to derive final waybill no from shipments
    let finalWaybillNo = orderId;
    try {
      const { data: shipment } = await supabaseAdmin
        .from("shipments")
        .select("tracking_no, outbound_tracking_no, delivery_tracking_no, pickup_tracking_no")
        .eq("order_id", orderId)
        .maybeSingle();
      finalWaybillNo =
        shipment?.delivery_tracking_no ||
        shipment?.outbound_tracking_no ||
        shipment?.tracking_no ||
        shipment?.pickup_tracking_no ||
        orderId;
    } catch {}

    const buffer = Buffer.from(base64, "base64");
    const blob = new Blob([buffer], { type: mimeType || "video/webm" });

    const videoId = await uploadToCloudflareStream(blob, finalWaybillNo, "outbound_video");
    
    // 출고 영상 업로드 완료 → 병합 트리거 호출 (비동기, 실패해도 무시)
    try {
      console.log("🔄 병합 트리거 호출 시작:", finalWaybillNo);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await fetch(`${baseUrl}/api/ops/merge-trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalWaybillNo }),
      });
    } catch (mergeError) {
      console.error("⚠️ 병합 트리거 실패 (무시):", mergeError);
    }
    
    return NextResponse.json({ success: true, videoId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Stream upload failed" }, { status: 500 });
  }
}


