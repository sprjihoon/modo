import { NextRequest, NextResponse } from "next/server";
import { isVercelCronRequest } from "@/lib/admin-host";
import { requireAdmin } from "@/lib/ops-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { expireAbandonedCarts } from "@/lib/cart-draft-expire";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function authorize(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (cronSecret && header === `Bearer ${cronSecret}`) {
    return { ok: true as const };
  }
  if (isVercelCronRequest(request.headers)) {
    return { ok: true as const };
  }
  const auth = await requireAdmin();
  if (auth.response) return { ok: false as const, response: auth.response };
  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;
  try {
    const result = await expireAbandonedCarts(getSupabaseAdmin());
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("[cart-drafts] expire failed", e);
    return NextResponse.json({ error: "만료 장바구니 정리에 실패했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
