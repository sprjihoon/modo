import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const PAID_STATUSES = new Set(["PAID", "COMPLETED", "DONE"]);

function getTossSecretKey(): string {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) throw new Error("TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.");
  return key;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !srk) throw new Error("Supabase service role 환경 변수가 설정되지 않았습니다.");
  return createSupabaseClient(url, srk, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * 사용자가 자기 주문을 취소하는 API
 *
 * 1. 본인 주문인지 확인
 * 2. 우체국 수거 예약 취소 (shipments-cancel Edge)
 * 3. 결제가 완료된 주문이면 Toss 카드 자동 취소 (서비스롤로 paymentKey 조회/업데이트)
 * 4. orders.status = CANCELLED, payment_status = CANCELED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reason: string | undefined = body?.reason;

    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    const admin = getSupabaseAdmin();
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, status, payment_status, payment_key, total_price, user_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { success: false, error: "주문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const ownerIds = [userRow?.id, user.id].filter(Boolean);
    if (!ownerIds.includes((order as { user_id: string }).user_id)) {
      return NextResponse.json(
        { success: false, error: "본인 주문만 취소할 수 있습니다." },
        { status: 403 }
      );
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json({ success: true, alreadyCancelled: true });
    }

    // 정책: 수거 완료(=INBOUND) 이후에는 사용자가 직접 취소할 수 없음.
    //       이미 의류가 출발했거나 보관/작업 단계이므로 반송 절차로만 처리 가능.
    //       → 관리자 승인을 통한 RETURN 워크플로우로 안내
    const SELF_CANCELLABLE = new Set(["PENDING_PAYMENT", "PENDING", "PAID", "BOOKED"]);
    if (!SELF_CANCELLABLE.has(order.status)) {
      return NextResponse.json(
        {
          success: false,
          code: "PICKUP_ALREADY_DONE",
          error: "수거가 완료된 주문은 직접 취소할 수 없습니다. 반송 처리는 고객센터로 문의해 주세요.",
        },
        { status: 409 }
      );
    }

    const paymentKey = (order as { payment_key: string | null }).payment_key;
    const paymentStatus = (order as { payment_status: string | null }).payment_status;
    const totalPrice = (order as { total_price: number | null }).total_price;
    const hasValidPayment = !!paymentKey && PAID_STATUSES.has(paymentStatus ?? "");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // 1) 우체국 수거 취소
    const shipmentRes = await fetch(`${supabaseUrl}/functions/v1/shipments-cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ order_id: orderId, delete_after_cancel: false }),
    });
    const shipmentResult = await shipmentRes.json().catch(() => ({}));

    if (!shipmentRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: shipmentResult?.error || "수거 취소에 실패했습니다.",
          step: "shipment",
        },
        { status: 500 }
      );
    }

    // 2) 카드 결제 취소 (있을 때만)
    let paymentCancelResult: Record<string, unknown> | null = null;
    let paymentCancelError: string | null = null;

    if (hasValidPayment) {
      try {
        const encodedKey = Buffer.from(`${getTossSecretKey()}:`).toString("base64");
        const tossRes = await fetch(
          `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${encodedKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              cancelReason: reason || "고객 요청 - 수거 예약 취소",
            }),
          }
        );
        const tossData = await tossRes.json();

        if (!tossRes.ok) {
          paymentCancelError = tossData?.message || "카드 취소 실패";
        } else {
          paymentCancelResult = tossData;
          await admin
            .from("orders")
            .update({
              status: "CANCELLED",
              payment_status: "CANCELED",
              canceled_at: new Date().toISOString(),
              cancellation_reason: reason || "고객 요청 - 수거 예약 취소",
            })
            .eq("id", orderId);

          try {
            await admin.from("payment_logs").insert({
              order_id: orderId,
              payment_key: paymentKey,
              amount: totalPrice ?? tossData.totalAmount,
              status: "CANCELED",
              provider: "TOSS",
              response_data: tossData,
            });
          } catch {
            /* log table 미존재 시 무시 */
          }
        }
      } catch (e) {
        paymentCancelError = e instanceof Error ? e.message : String(e);
      }
    } else {
      // 결제가 없거나 paymentKey가 없을 때는 주문만 취소
      await admin
        .from("orders")
        .update({
          status: "CANCELLED",
          canceled_at: new Date().toISOString(),
          cancellation_reason: reason || "고객 요청 - 수거 예약 취소",
        })
        .eq("id", orderId);
    }

    return NextResponse.json({
      success: true,
      message: shipmentResult?.message || "수거 예약이 취소되었습니다.",
      shipmentCanceled: true,
      paymentCanceled: !!paymentCancelResult,
      paymentCancelError,
      hasValidPayment,
      epost_result: shipmentResult?.epost_result,
    });
  } catch (e) {
    console.error("주문 취소 오류:", e);
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "취소 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
