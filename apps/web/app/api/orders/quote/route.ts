import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getAuthorizedUser, quoteOrder } from "@/lib/order-pricing";

/**
 * POST /api/orders/quote
 *
 * 픽업 페이로드를 받아 서버 권위적 가격을 계산하고
 * payment_intents 에 저장 후 intent_id 를 반환한다.
 *
 * 클라이언트는 받은 intent_id 를 Toss orderId 로 사용하여 결제 위젯을 띄운다.
 * 결제 성공 시 payments-confirm-toss 가 intent_id 로 인텐트를 조회해
 * orders 를 PAID 상태로 직접 INSERT 한다.
 *
 * → PENDING_PAYMENT 좀비 주문 절대 안 남음.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthorizedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.agreedToExtraCharge) {
      return NextResponse.json({ error: "추가 결제 동의가 필요합니다." }, { status: 400 });
    }

    const result = await quoteOrder(user, body);

    // service-role client 로 payment_intents insert (RLS 우회)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !srk) {
      return NextResponse.json(
        { error: "서버 설정 오류 (SERVICE_ROLE_KEY 누락)" },
        { status: 500 }
      );
    }

    const admin = createSupabaseClient(url, srk, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: intent, error: intentErr } = await admin
      .from("payment_intents")
      .insert({
        user_id: user.internalUserId,
        total_price: result.totalPrice,
        payload: result.pickupPayload,
      })
      .select("id")
      .single();

    if (intentErr || !intent) {
      console.error("payment_intent insert error:", intentErr);
      // payment_intents 테이블이 아직 없는 경우(마이그레이션 미적용) 명시적 에러
      return NextResponse.json(
        { error: "결제 인텐트 생성 실패. 관리자에게 문의해주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      intentId: intent.id as string,
      totalPrice: result.totalPrice,
      repairItemsTotal: result.repairItemsTotal,
      baseShippingFee: result.baseShippingFee,
      shippingFee: result.shippingFee,
      shippingDiscountAmount: result.shippingDiscountAmount,
      shippingPromotionId: result.shippingPromotionId,
      remoteAreaFee: result.remoteAreaFee,
      promotionDiscountAmount: result.promotionDiscountAmount,
      verifiedPromotionCodeId: result.verifiedPromotionCodeId,
      itemName: result.pickupPayload.itemName,
    });
  } catch (e) {
    console.error("orders/quote error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
