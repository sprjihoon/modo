import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildRepairSummary,
  isWholeStarRating,
  maskDisplayName,
  REVIEW_PHOTO_MAX,
  sanitizeReviewPhotoUrls,
  toMyReview,
  toPublicReview,
} from "@/lib/reviews";
import type { MyReview } from "@/lib/reviews";

export const dynamic = "force-dynamic";

const PUBLIC_COLS =
  "id, rating, content, photo_urls, display_name, repair_summary, points_type, reviewed_at";

const MINE_COLS =
  "id, order_id, rating, content, photo_urls, display_name, repair_summary, points_type, reviewed_at, status, points_awarded";

async function loadMineReviews(admin: ReturnType<typeof createServiceClient>): Promise<MyReview[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: userRow } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!userRow) return [];

  const { data } = await admin
    .from("reviews")
    .select(MINE_COLS)
    .eq("user_id", userRow.id)
    .order("reviewed_at", { ascending: false });

  return (data ?? []).map(toMyReview);
}

export async function GET(request: NextRequest) {
  try {
    const admin = createServiceClient();
    const { searchParams } = request.nextUrl;
    const sort = searchParams.get("sort") === "recent" ? "recent" : "rating";
    const photoOnly = searchParams.get("photo") === "1";
    const home = searchParams.get("home") === "1";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 50);
    const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

    const { data: stats } = await admin
      .from("reviews")
      .select("rating")
      .eq("status", "approved");

    const ratings = (stats ?? []).map((r) => r.rating as number);
    const average =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, n) => sum + n, 0) / ratings.length) * 10) / 10
        : 0;
    const approvedCount = ratings.length;

    if (home) {
      const { data: featured, error: featuredError } = await admin
        .from("reviews")
        .select(PUBLIC_COLS)
        .eq("status", "approved")
        .eq("is_featured", true)
        .order("display_order", { ascending: true });

      if (featuredError) {
        return NextResponse.json({ error: featuredError.message }, { status: 500 });
      }

      if (featured && featured.length > 0) {
        return NextResponse.json({
          reviews: featured.map(toPublicReview),
          count: approvedCount,
          average,
          curated: true,
        });
      }
    }

    let query = admin
      .from("reviews")
      .select(PUBLIC_COLS, { count: "exact" })
      .eq("status", "approved");

    if (photoOnly) {
      query = query.eq("points_type", "photo");
    }

    if (sort === "recent") {
      query = query.order("reviewed_at", { ascending: false });
    } else {
      query = query.order("rating", { ascending: false }).order("reviewed_at", { ascending: false });
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mine = home ? [] : await loadMineReviews(admin);

    return NextResponse.json({
      reviews: (data ?? []).map(toPublicReview),
      mine,
      count: count ?? approvedCount,
      average,
      curated: false,
    });
  } catch (e) {
    console.error("[reviews GET]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const orderId = String(body.order_id ?? "").trim();
    const rating = Number(body.rating);
    const content = String(body.content ?? "").trim();
    const photoUrls = sanitizeReviewPhotoUrls(body.photo_urls);

    if (!orderId) {
      return NextResponse.json({ error: "주문을 선택해 주세요." }, { status: 400 });
    }
    if (!isWholeStarRating(rating)) {
      return NextResponse.json({ error: "별점은 1~5점 중 정수로만 선택할 수 있습니다." }, { status: 400 });
    }
    if (photoUrls.length > REVIEW_PHOTO_MAX) {
      return NextResponse.json({ error: `사진은 최대 ${REVIEW_PHOTO_MAX}장까지 올릴 수 있습니다.` }, { status: 400 });
    }

    const admin = createServiceClient();
    const { data: userRow } = await admin
      .from("users")
      .select("id, name")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!userRow) {
      return NextResponse.json({ error: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const { data: order } = await admin
      .from("orders")
      .select("id, user_id, status, item_name, clothing_type, repair_parts")
      .eq("id", orderId)
      .maybeSingle();

    if (!order || order.user_id !== userRow.id) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }
    if (order.status !== "DELIVERED") {
      return NextResponse.json({ error: "배송이 완료된 주문만 리뷰를 작성할 수 있습니다." }, { status: 400 });
    }

    const { data: existing } = await admin
      .from("reviews")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "이미 이 주문에 리뷰를 작성했습니다." }, { status: 409 });
    }

    const { data: settings } = await admin
      .from("review_settings")
      .select("text_review_points, photo_review_points, is_active, min_content_length")
      .eq("id", 1)
      .maybeSingle();

    const minLen = settings?.min_content_length ?? 10;
    if (content.length < minLen) {
      return NextResponse.json({ error: `리뷰는 ${minLen}자 이상 작성해 주세요.` }, { status: 400 });
    }

    const validPhotos = photoUrls;
    const pointsType = validPhotos.length > 0 ? "photo" : "text";
    const { data: priorPoints } = await admin
      .from("point_transactions")
      .select("id")
      .eq("order_id", orderId)
      .eq("user_id", userRow.id)
      .in("description", ["포토 리뷰 작성", "리뷰 작성"])
      .limit(1);
    const pointsActive = (settings?.is_active ?? true) && (priorPoints ?? []).length === 0;
    const pointsAmount = pointsActive
      ? pointsType === "photo"
        ? settings?.photo_review_points ?? 500
        : settings?.text_review_points ?? 200
      : 0;

    const { data: review, error: insertError } = await admin
      .from("reviews")
      .insert({
        order_id: orderId,
        user_id: userRow.id,
        rating,
        content,
        photo_urls: validPhotos,
        status: "pending",
        display_name: maskDisplayName(userRow.name),
        repair_summary: buildRepairSummary(order),
        points_awarded: 0,
        points_type: pointsType,
      })
      .select("id, order_id, rating, content, photo_urls, display_name, repair_summary, points_type, reviewed_at, status, points_awarded")
      .single();

    if (insertError || !review) {
      console.error("[reviews POST] insert", insertError);
      return NextResponse.json({ error: "리뷰 저장에 실패했습니다." }, { status: 500 });
    }

    if (pointsAmount > 0) {
      const { error: pointError } = await admin.rpc("manage_user_points", {
        p_user_id: userRow.id,
        p_amount: pointsAmount,
        p_type: "EARNED",
        p_description: pointsType === "photo" ? "포토 리뷰 작성" : "리뷰 작성",
        p_order_id: orderId,
        p_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (pointError) {
        console.error("[reviews POST] points", pointError);
      } else {
        await admin
          .from("reviews")
          .update({ points_awarded: pointsAmount })
          .eq("id", review.id);
        review.points_awarded = pointsAmount;
      }
    }

    return NextResponse.json({
      review: toMyReview(review),
    });
  } catch (e) {
    console.error("[reviews POST]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
