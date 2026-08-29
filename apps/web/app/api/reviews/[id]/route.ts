import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  isWholeStarRating,
  reviewImageStoragePaths,
  sanitizeReviewPhotoUrls,
  toMyReview,
} from "@/lib/reviews";

export const dynamic = "force-dynamic";

const OWNER_COLS =
  "id, order_id, user_id, rating, content, photo_urls, display_name, repair_summary, points_type, reviewed_at, status, points_awarded";

async function requireOwner(reviewId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }

  const admin = createServiceClient();
  const { data: userRow } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!userRow) {
    return { error: NextResponse.json({ error: "사용자 정보를 찾을 수 없습니다." }, { status: 404 }) };
  }

  const { data: review } = await admin
    .from("reviews")
    .select(OWNER_COLS)
    .eq("id", reviewId)
    .maybeSingle();

  if (!review || review.user_id !== userRow.id) {
    return { error: NextResponse.json({ error: "리뷰를 찾을 수 없습니다." }, { status: 404 }) };
  }

  return { admin, userRow, review };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const owner = await requireOwner(id);
    if (owner.error) return owner.error;

    const { data: order } = await owner.admin
      .from("orders")
      .select("id, item_name")
      .eq("id", owner.review.order_id)
      .maybeSingle();

    const { data: settings } = await owner.admin
      .from("review_settings")
      .select("text_review_points, photo_review_points, is_active, min_content_length")
      .eq("id", 1)
      .maybeSingle();

    return NextResponse.json({
      review: toMyReview(owner.review),
      order: { id: order?.id ?? owner.review.order_id, item_name: order?.item_name ?? owner.review.repair_summary },
      settings: {
        text_review_points: settings?.text_review_points ?? 200,
        photo_review_points: settings?.photo_review_points ?? 500,
        is_active: settings?.is_active ?? true,
        min_content_length: settings?.min_content_length ?? 10,
      },
    });
  } catch (e) {
    console.error("[reviews GET id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const owner = await requireOwner(id);
    if (owner.error) return owner.error;

    const body = await request.json().catch(() => ({}));
    const rating = Number(body.rating);
    const content = String(body.content ?? "").trim();
    const photoUrls = sanitizeReviewPhotoUrls(body.photo_urls);

    if (!isWholeStarRating(rating)) {
      return NextResponse.json({ error: "별점은 1~5점 중 정수로만 선택할 수 있습니다." }, { status: 400 });
    }

    const { data: settings } = await owner.admin
      .from("review_settings")
      .select("min_content_length")
      .eq("id", 1)
      .maybeSingle();
    const minLen = settings?.min_content_length ?? 10;
    if (content.length < minLen) {
      return NextResponse.json({ error: `리뷰는 ${minLen}자 이상 작성해 주세요.` }, { status: 400 });
    }

    const { data: updated, error } = await owner.admin
      .from("reviews")
      .update({
        rating,
        content,
        photo_urls: photoUrls,
        points_type: photoUrls.length > 0 ? "photo" : "text",
        status: "pending",
        is_featured: false,
        display_order: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", owner.userRow.id)
      .select(OWNER_COLS)
      .single();

    if (error || !updated) {
      console.error("[reviews PATCH]", error);
      return NextResponse.json({ error: "리뷰 수정에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ review: toMyReview(updated) });
  } catch (e) {
    console.error("[reviews PATCH]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const owner = await requireOwner(id);
    if (owner.error) return owner.error;

    const paths = reviewImageStoragePaths(owner.review.photo_urls ?? []);
    if (paths.length > 0) {
      await owner.admin.storage.from("review-images").remove(paths);
    }

    const { error } = await owner.admin
      .from("reviews")
      .delete()
      .eq("id", id)
      .eq("user_id", owner.userRow.id);

    if (error) {
      return NextResponse.json({ error: error.message || "리뷰 삭제에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[reviews DELETE]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
