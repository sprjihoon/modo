import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

    const bucket = "ops-videos";
    try {
      // @ts-ignore service role only
      await supabaseAdmin.storage.createBucket(bucket, { public: true });
    } catch {}

    const buffer = Buffer.from(base64, "base64");
    const key = `outbound/${orderId}-${Date.now()}.webm`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(key, buffer, {
        contentType: mimeType || "video/webm",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(key);
    const publicUrl = pub?.publicUrl;

    // Store to shipments (best effort)
    try {
      await supabaseAdmin
        .from("shipments")
        .update({ outbound_video_url: publicUrl })
        .eq("order_id", orderId);
    } catch {}

    // Note: Merging is expected to be triggered by storage event worker
    return NextResponse.json({ success: true, url: publicUrl, path: key });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 });
  }
}


