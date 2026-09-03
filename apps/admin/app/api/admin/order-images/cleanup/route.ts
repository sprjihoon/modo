import { NextRequest, NextResponse } from "next/server";
import { isVercelCronRequest } from "@/lib/admin-host";
import { requireAdmin } from "@/lib/ops-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { expireAbandonedCarts } from "@/lib/cart-draft-expire";
import { classifyStoredOrderImages, cleanupOrderImages } from "@/lib/order-image-cleanup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function authorize(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (cronSecret && header === `Bearer ${cronSecret}`) {
    return { ok: true as const, via: "cron" as const };
  }
  if (isVercelCronRequest(request.headers)) {
    return { ok: true as const, via: "cron" as const };
  }
  const auth = await requireAdmin();
  if (auth.response) return { ok: false as const, response: auth.response };
  return { ok: true as const, via: "admin" as const };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;
  try {
    const admin = getSupabaseAdmin();
    if (auth.via === "cron") {
      const carts = await expireAbandonedCarts(admin);
      const result = await cleanupOrderImages(admin, "run");
      return NextResponse.json({ success: true, carts, ...result });
    }
    const preview = await classifyStoredOrderImages(admin);
    return NextResponse.json({ success: true, summary: preview.summary });
  } catch (e) {
    console.error("[order-images] preview/cron failed", e);
    return NextResponse.json({ error: "사진 정리 조회에 실패했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  try {
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    const action =
      body.action === "orphans" || body.action === "expired" || body.action === "run"
        ? body.action
        : "orphans";
    const result = await cleanupOrderImages(getSupabaseAdmin(), action);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("[order-images] cleanup failed", e);
    return NextResponse.json({ error: "사진 정리에 실패했습니다." }, { status: 500 });
  }
}
