import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { uploadToCloudflareStream } from "@/lib/cloudflareStreamUpload";
import { uploadToCloudflareStreamTus } from "@/lib/cloudflareStreamUploadTus";

// 🚀 Feature Flags
const USE_TUS_UPLOAD = process.env.NEXT_PUBLIC_USE_TUS_UPLOAD === 'true';
const USE_DIRECT_FILE = process.env.NEXT_PUBLIC_USE_DIRECT_FILE_UPLOAD === 'true';

export async function POST(req: NextRequest) {
  try {
    // 🔄 Feature Flag: Direct File Upload vs Base64
    if (USE_DIRECT_FILE) {
      // ✨ 새로운 방식: FormData로 직접 파일 전송
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const orderId = formData.get('orderId') as string;
      const sequence = parseInt(formData.get('sequence') as string) || 1;
      const durationSeconds = parseFloat(formData.get('durationSeconds') as string);

      if (!orderId || !file) {
        return NextResponse.json({ error: "orderId and file are required" }, { status: 400 });
      }

      return handleFileUpload(file, orderId, sequence, durationSeconds);
    } else {
      // 🔙 기존 방식: Base64 인코딩
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

      const buffer = Buffer.from(base64, "base64");
      const file = new Blob([buffer], { type: mimeType || "video/webm" }) as any;
      file.name = `${orderId}.webm`;
      
      return handleFileUpload(file, orderId, sequence || 1, durationSeconds);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Stream upload failed" }, { status: 500 });
  }
}

async function handleFileUpload(
  file: File | Blob,
  orderId: string,
  sequence: number,
  durationSeconds?: number
) {
  try {

    // 작업 영상: delivery_tracking_no (출고 송장번호) 사용
    let finalWaybillNo = orderId;
    try {
      const { data: shipment } = await supabaseAdmin
        .from("shipments")
        .select("tracking_no, delivery_tracking_no, pickup_tracking_no")
        .eq("order_id", orderId)
        .maybeSingle();
      
      // 작업 단계이므로 출고 송장번호 우선
      finalWaybillNo =
        shipment?.delivery_tracking_no ||
        shipment?.tracking_no ||
        shipment?.pickup_tracking_no ||
        orderId;
      
      console.log("📦 작업 영상 final_waybill_no:", finalWaybillNo);
    } catch (e) {
      console.error("❌ shipment 조회 실패:", e);
    }

    // 🔄 Feature Flag: TUS Protocol vs Direct Upload
    let videoId: string;
    
    if (USE_TUS_UPLOAD) {
      // ✨ 새로운 방식: TUS Protocol (Resumable Upload)
      console.log("🚀 Using TUS Protocol for resumable upload");
      videoId = await uploadToCloudflareStreamTus({
        file: file as File,
        finalWaybillNo,
        type: "work_video",
        sequence,
        durationSeconds,
        onProgress: (progress) => {
          // 진행률 로깅 (WebSocket으로 전송 가능)
          console.log(`📤 Upload progress: ${progress.percentage.toFixed(1)}%`);
        },
      });
    } else {
      // 🔙 기존 방식: Direct Upload
      console.log("📤 Using Direct Upload (legacy)");
      const blob = file instanceof Blob ? file : new Blob([file]);
      videoId = await uploadToCloudflareStream(
        blob,
        finalWaybillNo,
        "work_video",
        sequence,
        durationSeconds
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      videoId, 
      duration: durationSeconds,
      // 디버그 정보
      uploadMethod: USE_TUS_UPLOAD ? 'tus' : 'direct',
      fileUploadMethod: USE_DIRECT_FILE ? 'formdata' : 'base64',
    });
  } catch (e: any) {
    console.error("❌ Upload error:", e);
    return NextResponse.json({ error: e.message || "Stream upload failed" }, { status: 500 });
  }
}

