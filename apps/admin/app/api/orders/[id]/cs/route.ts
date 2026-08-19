import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";
import { notifyCustomer } from "@/lib/notify-customer";
import {
  CLOSED_CS_STATUSES,
  WORKSHOP_STATUSES,
  compensationAmount,
  repairFeeOf,
  snapshotShipment,
  type CsAction,
} from "@/lib/order-cs";

export const dynamic = "force-dynamic";

async function actorName(admin: ReturnType<typeof getSupabaseAdmin>, actorId: string) {
  const { data } = await admin.from("users").select("name").eq("id", actorId).maybeSingle();
  return data?.name ?? "관리자";
}

async function portonePartialCancel(paymentId: string, amount: number, reason: string) {
  const key = process.env.PORTONE_API_SECRET;
  if (!key) throw new Error("PORTONE_API_SECRET이 없습니다.");
  const res = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `PortOne ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason, amount }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "결제 환불에 실패했습니다.");
  }
  return data;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("order_cs_events")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, events: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id: orderId } = await params;
  const body = await request.json();
  const action = body.action as CsAction;
  const reason = String(body.reason ?? "").trim();

  if (!["REWORK", "REPAIR_REFUND", "COMPENSATION"].includes(action)) {
    return NextResponse.json({ success: false, error: "유효하지 않은 처리입니다." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ success: false, error: "사유를 입력해 주세요." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  try {
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return NextResponse.json({ success: false, error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  const csStatus = (order.cs_status as string | null) ?? null;
  if (CLOSED_CS_STATUSES.has(csStatus ?? "")) {
    return NextResponse.json(
      { success: false, error: "환불·보상 처리된 주문은 다시 CS 처리할 수 없습니다." },
      { status: 400 }
    );
  }

  const name = await actorName(admin, auth.user.id);
  const repairFee = repairFeeOf(order);
  const orderNumber = order.order_number || order.id.slice(-8);
  const currentCycle = Number(order.cs_cycle ?? 1);

  const { data: shipment } = await admin
    .from("shipments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (action === "REWORK") {
    const status = String(order.status);
    if (["CANCELLED", "RETURN_PENDING", "RETURN_SHIPPING", "RETURN_DONE"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "취소·반송 주문은 재작업할 수 없습니다." },
        { status: 400 }
      );
    }

    const atHome = status === "DELIVERED";
    const atWorkshop = WORKSHOP_STATUSES.has(status);
    if (!atHome && !atWorkshop) {
      return NextResponse.json(
        { success: false, error: `현재 상태(${status})에서는 재작업을 시작할 수 없습니다.` },
        { status: 400 }
      );
    }

    const nextCycle = currentCycle + 1;
    const pickupDate = atHome ? String(body.pickupDate ?? "").trim() : "";
    if (atHome && !pickupDate) {
      return NextResponse.json(
        { success: false, error: "고객 집 재수거는 수거일을 지정해 주세요." },
        { status: 400 }
      );
    }

    const nextStatus = atHome ? "BOOKED" : "PROCESSING";
    const { error: updErr } = await admin
      .from("orders")
      .update({
        cs_cycle: nextCycle,
        cs_status: "REWORK",
        status: nextStatus,
        ...(atHome ? { pickup_date: pickupDate } : {}),
      })
      .eq("id", orderId);

    if (updErr) {
      return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
    }

    let bookWarning: string | null = null;
    if (atHome) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && serviceRoleKey) {
          const bookRes = await fetch(`${supabaseUrl}/functions/v1/shipments-book`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              order_id: orderId,
              customer_name: order.customer_name,
              pickup_address: order.pickup_address,
              pickup_address_detail: order.pickup_address_detail,
              pickup_zipcode: order.pickup_zipcode,
              pickup_phone: order.pickup_phone || order.customer_phone,
              delivery_address: order.delivery_address,
              delivery_address_detail: order.delivery_address_detail,
              delivery_zipcode: order.delivery_zipcode,
              delivery_phone: order.delivery_phone || order.customer_phone,
              goods_name: order.item_name || "의류 수선(재작업)",
            }),
          });
          if (!bookRes.ok) {
            bookWarning = "회차는 열렸지만 우체국 수거 예약에 실패했습니다. 송장을 다시 확인해 주세요.";
          }
        }
      } catch (e) {
        console.warn("재작업 수거 예약 호출 실패:", e);
        bookWarning = "회차는 열렸지만 우체국 수거 예약에 실패했습니다. 송장을 다시 확인해 주세요.";
      }
    }

    const { error: evErr } = await admin.from("order_cs_events").insert({
      order_id: orderId,
      cycle: nextCycle,
      action: "REWORK",
      reason,
      clothes_location: atHome ? "HOME" : "WORKSHOP",
      pickup_date: atHome ? pickupDate : null,
      actor_id: auth.user.id,
      actor_name: name,
      metadata: {
        previousStatus: status,
        previousCycle: currentCycle,
        shipmentSnapshot: snapshotShipment(shipment as Record<string, unknown> | null),
      },
    });
    if (evErr) {
      throw new Error(
        `회차는 열렸지만 이력 저장에 실패했습니다. 다시 재작업하지 말고 이력을 확인해 주세요. (${evErr.message})`
      );
    }

    await notifyCustomer(admin, {
      userId: order.user_id,
      orderId,
      type: "order_cs_rework",
      title: "재작업이 시작되었습니다",
      body: `주문(${orderNumber}) 수선을 다시 진행합니다. 진행 현황에서 확인할 수 있습니다.`,
    });

    return NextResponse.json({
      success: true,
      message: bookWarning
        ?? (atHome
          ? `${nextCycle}회차 재작업: 수거 예약을 다시 진행합니다.`
          : `${nextCycle}회차 재작업: 공방에서 작업을 다시 진행합니다.`),
    });
  }

  if (action === "REPAIR_REFUND") {
    if (repairFee <= 0) {
      return NextResponse.json({ success: false, error: "환불할 수선비가 없습니다." }, { status: 400 });
    }
    if (order.payment_id) {
      await portonePartialCancel(order.payment_id, repairFee, `CS 수선비 환불: ${reason}`);
      await admin
        .from("orders")
        .update({
          payment_status: "PARTIAL_CANCELED",
          cs_status: "REPAIR_REFUNDED",
        })
        .eq("id", orderId);
    } else {
      await admin.from("orders").update({ cs_status: "REPAIR_REFUNDED" }).eq("id", orderId);
    }

    const { error: evErr } = await admin.from("order_cs_events").insert({
      order_id: orderId,
      cycle: currentCycle,
      action: "REPAIR_REFUND",
      reason,
      amount: repairFee,
      actor_id: auth.user.id,
      actor_name: name,
    });
    if (evErr) {
      throw new Error(
        `환불은 요청됐지만 이력 저장에 실패했습니다. 중복 환불하지 마세요. (${evErr.message})`
      );
    }

    await notifyCustomer(admin, {
      userId: order.user_id,
      orderId,
      type: "order_cs_repair_refund",
      title: "수선비 환불",
      body: `주문(${orderNumber}) 수선비 ${repairFee.toLocaleString()}원이 환불 처리됩니다. 카드사 기준 3~7 영업일입니다.`,
    });

    return NextResponse.json({
      success: true,
      message: `수선비 ${repairFee.toLocaleString()}원 환불을 처리했습니다.`,
    });
  }

  const residualValue = Number(body.residualValue);
  if (!Number.isFinite(residualValue) || residualValue < 0) {
    return NextResponse.json({ success: false, error: "잔존가치를 입력해 주세요." }, { status: 400 });
  }

  const amount = compensationAmount(residualValue, repairFee);
  const refundRepairFee = Boolean(body.refundRepairFee);
  const payoutMethod = String(body.payoutMethod ?? "BANK");

  if (refundRepairFee && repairFee > 0 && order.payment_id) {
    await portonePartialCancel(order.payment_id, repairFee, `CS 전손 처리 수선비 환불: ${reason}`);
    await admin
      .from("orders")
      .update({
        payment_status: "PARTIAL_CANCELED",
        cs_status: "COMPENSATED",
      })
      .eq("id", orderId);
  } else {
    await admin.from("orders").update({ cs_status: "COMPENSATED" }).eq("id", orderId);
  }

  const { error: evErr } = await admin.from("order_cs_events").insert({
    order_id: orderId,
    cycle: currentCycle,
    action: "COMPENSATION",
    reason,
    amount,
    residual_value: Math.round(residualValue),
    payout_method: payoutMethod,
    payout_status: "PENDING",
    refund_repair_fee: refundRepairFee,
    actor_id: auth.user.id,
    actor_name: name,
    metadata: {
      repairFee,
      formula: `min(${Math.round(residualValue)}, ${repairFee}×5, 200000)`,
    },
  });
  if (evErr) {
    throw new Error(
      `보상은 기록 직전에서 실패했습니다. 중복 처리하지 말고 주문을 확인해 주세요. (${evErr.message})`
    );
  }

  await notifyCustomer(admin, {
    userId: order.user_id,
    orderId,
    type: "order_cs_compensation",
    title: "보상 처리 안내",
    body: `주문(${orderNumber}) 의류 전손·분실 보상 ${amount.toLocaleString()}원으로 처리됩니다. 자세한 내용은 고객센터로 문의해 주세요.`,
  });

  return NextResponse.json({
    success: true,
    message: `보상금 ${amount.toLocaleString()}원을 기록했습니다. 실제 지급은 별도로 진행해 주세요.`,
    amount,
  });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "처리에 실패했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
