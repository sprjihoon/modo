import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createServiceClient();
    const { data } = await admin
      .from("review_settings")
      .select("text_review_points, photo_review_points, is_active, min_content_length")
      .eq("id", 1)
      .maybeSingle();

    return NextResponse.json({
      text_review_points: data?.text_review_points ?? 200,
      photo_review_points: data?.photo_review_points ?? 500,
      is_active: data?.is_active ?? true,
      min_content_length: data?.min_content_length ?? 10,
    });
  } catch (e) {
    console.error("[reviews/settings]", e);
    return NextResponse.json({
      text_review_points: 200,
      photo_review_points: 500,
      is_active: true,
      min_content_length: 10,
    });
  }
}
