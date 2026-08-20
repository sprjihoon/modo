import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

const MONEY_ACTIONS = ["PAYMENT_REFUND", "REPAIR_REFUND", "COMPENSATION"] as const;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "ALL";
  const payoutStatus = searchParams.get("payoutStatus") || "ALL";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "30", 10)));

  const admin = getSupabaseAdmin();

  let eventQuery = admin
    .from("order_cs_events")
    .select(
      `
      id, order_id, action, reason, amount, residual_value, payout_method, payout_status,
      actor_name, created_at,
      orders!inner ( id, order_number, customer_name, customer_phone, status, payment_status )
    `
    )
    .in("action", [...MONEY_ACTIONS])
    .not("amount", "is", null)
    .order("created_at", { ascending: false });

  if (action !== "ALL" && MONEY_ACTIONS.includes(action as (typeof MONEY_ACTIONS)[number])) {
    eventQuery = eventQuery.eq("action", action);
  }
  if (payoutStatus !== "ALL") {
    eventQuery = eventQuery.eq("payout_status", payoutStatus);
  }
  if (startDate) eventQuery = eventQuery.gte("created_at", `${startDate}T00:00:00`);
  if (endDate) eventQuery = eventQuery.lte("created_at", `${endDate}T23:59:59`);

  const { data: events, error } = await eventQuery;
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const rows = (events ?? []).map((row) => {
    const order = row.orders as unknown as {
      id: string;
      order_number: string;
      customer_name: string | null;
      customer_phone: string | null;
      status: string;
      payment_status: string | null;
    };
    return {
      id: row.id,
      source: "CS" as const,
      orderId: row.order_id,
      orderNumber: order?.order_number ?? row.order_id.slice(-8),
      customerName: order?.customer_name ?? "",
      customerPhone: order?.customer_phone ?? "",
      orderStatus: order?.status ?? "",
      paymentStatus: order?.payment_status ?? "",
      action: row.action,
      reason: row.reason,
      amount: Number(row.amount ?? 0),
      residualValue: row.residual_value,
      payoutMethod: row.payout_method,
      payoutStatus: row.payout_status,
      actorName: row.actor_name,
      createdAt: row.created_at,
    };
  });

  const eventOrderIds = new Set(rows.map((r) => r.orderId));

  let cancelQuery = admin
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, status, payment_status, total_price, cancellation_reason, canceled_at"
    )
    .or("status.eq.CANCELLED,payment_status.eq.CANCELED")
    .order("canceled_at", { ascending: false, nullsFirst: false });

  if (startDate) cancelQuery = cancelQuery.gte("canceled_at", `${startDate}T00:00:00`);
  if (endDate) cancelQuery = cancelQuery.lte("canceled_at", `${endDate}T23:59:59`);

  const includeLegacyCancels = action === "ALL" || action === "ORDER_CANCEL";
  const { data: cancels } = includeLegacyCancels ? await cancelQuery : { data: [] };

  const legacy = (cancels ?? [])
    .filter((o) => !eventOrderIds.has(o.id) && Number(o.total_price ?? 0) > 0)
    .map((o) => ({
      id: `order-cancel-${o.id}`,
      source: "ORDER" as const,
      orderId: o.id,
      orderNumber: o.order_number,
      customerName: o.customer_name ?? "",
      customerPhone: o.customer_phone ?? "",
      orderStatus: o.status,
      paymentStatus: o.payment_status,
      action: "ORDER_CANCEL",
      reason: o.cancellation_reason ?? "주문 취소",
      amount: Number(o.total_price ?? 0),
      residualValue: null as number | null,
      payoutMethod: null as string | null,
      payoutStatus: "PAID",
      actorName: null as string | null,
      createdAt: o.canceled_at ?? "",
    }));

  let merged = action === "ORDER_CANCEL" ? legacy : [...rows, ...legacy];
  if (search) {
    merged = merged.filter(
      (r) =>
        r.orderNumber.toLowerCase().includes(search) ||
        r.customerName.toLowerCase().includes(search) ||
        r.customerPhone.includes(search) ||
        r.reason.toLowerCase().includes(search)
    );
  }
  if (payoutStatus !== "ALL") {
    merged = merged.filter((r) => r.payoutStatus === payoutStatus);
  }

  merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const totals = {
    paymentRefund: 0,
    repairRefund: 0,
    compensation: 0,
    compensationPending: 0,
    orderCancel: 0,
  };
  for (const r of merged) {
    if (r.action === "PAYMENT_REFUND") totals.paymentRefund += r.amount;
    else if (r.action === "REPAIR_REFUND") totals.repairRefund += r.amount;
    else if (r.action === "COMPENSATION") {
      totals.compensation += r.amount;
      if (r.payoutStatus === "PENDING") totals.compensationPending += r.amount;
    } else if (r.action === "ORDER_CANCEL") totals.orderCancel += r.amount;
  }

  const totalCount = merged.length;
  const start = (page - 1) * limit;
  const items = merged.slice(start, start + limit);

  return NextResponse.json({
    success: true,
    items,
    totals: {
      ...totals,
      all: totals.paymentRefund + totals.repairRefund + totals.compensation + totals.orderCancel,
    },
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    },
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await request.json();
  const id = String(body.id ?? "");
  const payoutStatus = String(body.payoutStatus ?? "");
  if (!id || !["PENDING", "PAID"].includes(payoutStatus)) {
    return NextResponse.json({ success: false, error: "지급 상태가 올바르지 않습니다." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("order_cs_events")
    .update({ payout_status: payoutStatus })
    .eq("id", id)
    .eq("action", "COMPENSATION")
    .select("id, payout_status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ success: false, error: "보상 이력을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true, item: data });
}
