import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRequestAuthUser } from "@/lib/auth-user";
import { toMyReview } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createServiceClient();
    const { data: userRow } = await admin
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 홈 노출·공개 여부와 관계없이 작성자 본인 리뷰는 전부 반환
    const { data, error } = await admin
      .from("reviews")
      .select(
        "id, order_id, rating, content, photo_urls, display_name, repair_summary, points_type, reviewed_at, status, points_awarded"
      )
      .eq("user_id", userRow.id)
      .order("reviewed_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      reviews: (data ?? []).map(toMyReview),
    });
  } catch (e) {
    console.error("[reviews/mine]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
