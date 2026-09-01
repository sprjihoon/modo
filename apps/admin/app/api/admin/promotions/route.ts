import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";
import { buildCouponStats } from "@/lib/marketing-actions";
import { isPaidOrder } from "@/lib/marketing-insights";
import {
  buildPromotionInsert,
  uniqueCodeError,
} from "@/lib/promotion-code-payload";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const [promos, usages, orders] = await Promise.all([
      supabaseAdmin.from("promotion_codes").select("*").order("created_at", { ascending: false }),
      supabaseAdmin
        .from("promotion_code_usages")
        .select("promotion_code_id, user_id, order_id, discount_amount, final_amount, used_at"),
      supabaseAdmin
        .from("orders")
        .select("id, user_id, paid_at, created_at, total_price, payment_status, status, promotion_code_id, promotion_discount_amount")
        .not("promotion_code_id", "is", null),
    ]);

    if (promos.error) {
      return NextResponse.json(
        { success: false, error: promos.error.message || "프로모션 코드 조회 실패" },
        { status: 500 }
      );
    }

    const stats = buildCouponStats({
      promotions: promos.data || [],
      usages: usages.data || [],
      paidOrders: (orders.data || []).filter((order) => isPaidOrder(order)),
    });
    const statsById = new Map(stats.map((row) => [row.id, row]));

    const data = (promos.data || []).map((promo) => {
      const stat = statsById.get(promo.id);
      return {
        ...promo,
        used_count: stat?.uses ?? promo.used_count,
        uses: stat?.uses ?? promo.used_count ?? 0,
        users: stat?.users ?? 0,
        revenue: stat?.revenue ?? 0,
        discount: stat?.discount ?? 0,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "프로모션 코드 조회 중 오류가 발생했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const body = await req.json();
    const payload = buildPromotionInsert(body);
    if ("error" in payload) {
      return NextResponse.json({ success: false, error: payload.error }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("promotion_codes")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: uniqueCodeError(error) || error.message || "프로모션 코드 생성 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "프로모션 코드 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
