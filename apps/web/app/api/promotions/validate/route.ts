import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { code, orderAmount } = await req.json() as { code: string; orderAmount: number };

    if (!code || typeof orderAmount !== "number") {
      return NextResponse.json({ error: "code와 orderAmount가 필요합니다." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 프로모션 코드 조회
    const { data: promo } = await supabase
      .from("promotion_codes")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("is_active", true)
      .maybeSingle();

    if (!promo) {
      return NextResponse.json({ error: "유효하지 않은 프로모션 코드입니다." }, { status: 422 });
    }

    // 유효기간 확인
    const now = new Date();
    if (new Date(promo.valid_from) > now) {
      return NextResponse.json({ error: "아직 사용할 수 없는 프로모션 코드입니다." }, { status: 422 });
    }
    if (promo.valid_until && new Date(promo.valid_until) < now) {
      return NextResponse.json({ error: "만료된 프로모션 코드입니다." }, { status: 422 });
    }

    // 최소 주문 금액 확인
    const minOrderAmount = promo.min_order_amount ?? 0;
    if (orderAmount < minOrderAmount) {
      return NextResponse.json({
        error: `최소 주문 금액 ${minOrderAmount.toLocaleString()}원 이상부터 사용 가능합니다.`,
      }, { status: 422 });
    }

    // 최대 사용 횟수 확인
    if (promo.max_uses != null && (promo.used_count ?? 0) >= promo.max_uses) {
      return NextResponse.json({ error: "프로모션 코드 사용 가능 횟수가 초과되었습니다." }, { status: 422 });
    }

    // 사용자별 최대 사용 횟수 확인
    if (user) {
      const { data: usages } = await supabase
        .from("promotion_code_usages")
        .select("id")
        .eq("promotion_code_id", promo.id)
        .eq("user_id", user.id);
      const usedCount = usages?.length ?? 0;
      const maxPerUser = promo.max_uses_per_user ?? 1;
      if (usedCount >= maxPerUser) {
        return NextResponse.json({ error: "이미 사용한 프로모션 코드입니다." }, { status: 422 });
      }
    }

    // 할인 금액 계산
    let discountAmount = 0;
    if (promo.discount_type === "PERCENTAGE") {
      discountAmount = Math.round(orderAmount * promo.discount_value / 100);
    } else {
      discountAmount = promo.discount_value;
    }
    if (promo.max_discount_amount != null) {
      discountAmount = Math.min(discountAmount, promo.max_discount_amount);
    }
    discountAmount = Math.min(discountAmount, orderAmount);

    return NextResponse.json({
      id: promo.id,
      code: promo.code,
      description: promo.description,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      discount_amount: discountAmount,
      original_amount: orderAmount,
      final_amount: orderAmount - discountAmount,
    });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
