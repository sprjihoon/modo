import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRequestAuthUser } from "@/lib/auth-user";
import { DEFAULT_REVIEW_SETTINGS, listPendingReviewOrders } from "@/lib/pending-reviews";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestAuthUser(request);
    if (!user) {
      return NextResponse.json({ order: null, orders: [], settings: DEFAULT_REVIEW_SETTINGS });
    }

    const admin = createServiceClient();
    const { data: userRow } = await admin
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!userRow) {
      return NextResponse.json({ order: null, orders: [], settings: DEFAULT_REVIEW_SETTINGS });
    }

    const orders = await listPendingReviewOrders(admin, userRow.id);
    const { data: settings } = await admin
      .from("review_settings")
      .select("text_review_points, photo_review_points, is_active, min_content_length")
      .eq("id", 1)
      .maybeSingle();

    return NextResponse.json({
      order: orders[0] ?? null,
      orders,
      settings: {
        text_review_points: settings?.text_review_points ?? DEFAULT_REVIEW_SETTINGS.text_review_points,
        photo_review_points: settings?.photo_review_points ?? DEFAULT_REVIEW_SETTINGS.photo_review_points,
        is_active: settings?.is_active ?? DEFAULT_REVIEW_SETTINGS.is_active,
        min_content_length: settings?.min_content_length ?? DEFAULT_REVIEW_SETTINGS.min_content_length,
      },
    });
  } catch (e) {
    console.error("[reviews/pending GET]", e);
    return NextResponse.json({ order: null, orders: [], settings: DEFAULT_REVIEW_SETTINGS });
  }
}
