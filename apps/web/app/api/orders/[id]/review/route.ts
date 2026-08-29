import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRequestAuthUser } from "@/lib/auth-user";
import { toMyReview } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
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

    const { data: order } = await admin
      .from("orders")
      .select("id, user_id, status, item_name")
      .eq("id", orderId)
      .maybeSingle();

    if (!order || order.user_id !== userRow.id) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }

    const { data: review } = await admin
      .from("reviews")
      .select(
        "id, order_id, rating, content, photo_urls, display_name, repair_summary, points_type, reviewed_at, status, points_awarded"
      )
      .eq("order_id", orderId)
      .maybeSingle();

    const { data: settings } = await admin
      .from("review_settings")
      .select("text_review_points, photo_review_points, is_active, min_content_length")
      .eq("id", 1)
      .maybeSingle();

    return NextResponse.json({
      canWrite: order.status === "DELIVERED" && !review,
      order: { id: order.id, status: order.status, item_name: order.item_name },
      review: review ? toMyReview(review) : null,
      settings: {
        text_review_points: settings?.text_review_points ?? 200,
        photo_review_points: settings?.photo_review_points ?? 500,
        is_active: settings?.is_active ?? true,
        min_content_length: settings?.min_content_length ?? 10,
      },
    });
  } catch (e) {
    console.error("[orders/review GET]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
