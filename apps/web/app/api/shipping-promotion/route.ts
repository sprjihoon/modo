import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getShippingSettings, type ShippingPromoResult } from "@/lib/shipping-settings";

/**
 * GET /api/shipping-promotion?repairAmount=숫자
 * 현재 사용자에게 적용 가능한 배송비 프로모션을 계산하여 반환합니다.
 * 여러 프로모션 중 최대 할인이 적용됩니다.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const repairAmount = Number(request.nextUrl.searchParams.get("repairAmount") ?? "0");

    // 글로벌 배송비 설정 (관리자 페이지에서 변경 가능)
    const { baseShippingFee: BASE_SHIPPING_FEE } = await getShippingSettings();

    // 현재 활성화된 모든 배송비 프로모션 조회
    const now = new Date().toISOString();
    const { data: promotions } = await supabase
      .from("shipping_promotions")
      .select("*")
      .eq("is_active", true)
      .lte("valid_from", now)
      .or(`valid_until.is.null,valid_until.gte.${now}`)
      .order("created_at", { ascending: true });

    if (!promotions || promotions.length === 0) {
      return NextResponse.json<ShippingPromoResult>({
        baseShippingFee: BASE_SHIPPING_FEE,
        discountAmount: 0,
        finalShippingFee: BASE_SHIPPING_FEE,
        promotionId: null,
        promotionName: null,
        promotionDescription: null,
      });
    }

    let bestDiscount = 0;
    let bestPromotion: typeof promotions[0] | null = null;

    // 사용자의 첫 주문 여부 확인 (FIRST_ORDER 유형 존재 시)
    const hasFirstOrderPromo = promotions.some((p) => p.type === "FIRST_ORDER");
    let isFirstOrder = false;

    if (hasFirstOrderPromo && user) {
      // users 테이블에서 내부 ID 조회
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();

      const userId = userRow?.id ?? user.id;

      // 완료된 주문(BOOKED 이상) 수 조회
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("status", "in", '("CANCELLED","PENDING_PAYMENT")');

      isFirstOrder = (count ?? 0) === 0;
    }

    // 각 프로모션에 대해 할인액 계산
    for (const promo of promotions) {
      // 유형별 적용 조건 확인
      let eligible = false;
      switch (promo.type) {
        case "FIRST_ORDER":
          eligible = isFirstOrder;
          break;
        case "FREE_ABOVE_AMOUNT":
          eligible = repairAmount >= (promo.min_order_amount ?? 0);
          break;
        case "PERCENTAGE_OFF":
        case "FIXED_DISCOUNT":
          eligible = repairAmount >= (promo.min_order_amount ?? 0);
          break;
      }

      if (!eligible) continue;

      // 할인액 계산
      let discountAmt = 0;
      if (promo.discount_type === "PERCENTAGE") {
        discountAmt = Math.round(BASE_SHIPPING_FEE * promo.discount_value / 100);
      } else {
        discountAmt = promo.discount_value;
      }

      // 최대 할인 금액 제한
      if (promo.max_discount_amount != null) {
        discountAmt = Math.min(discountAmt, promo.max_discount_amount);
      }

      // 배송비를 초과하는 할인은 배송비로 제한
      discountAmt = Math.min(discountAmt, BASE_SHIPPING_FEE);

      if (discountAmt > bestDiscount) {
        bestDiscount = discountAmt;
        bestPromotion = promo;
      }
    }

    return NextResponse.json<ShippingPromoResult>({
      baseShippingFee: BASE_SHIPPING_FEE,
      discountAmount: bestDiscount,
      finalShippingFee: BASE_SHIPPING_FEE - bestDiscount,
      promotionId: bestPromotion?.id ?? null,
      promotionName: bestPromotion?.name ?? null,
      promotionDescription: bestPromotion?.description ?? null,
    });
  } catch (e) {
    console.error("Shipping promotion check error:", e);
    // 오류 시 기본 배송비 반환 (주문 프로세스 차단하지 않음)
    const { baseShippingFee } = await getShippingSettings().catch(() => ({ baseShippingFee: 7000 }));
    return NextResponse.json<ShippingPromoResult>({
      baseShippingFee,
      discountAmount: 0,
      finalShippingFee: baseShippingFee,
      promotionId: null,
      promotionName: null,
      promotionDescription: null,
    });
  }
}
