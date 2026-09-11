import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isUnavailablePickupDate, shouldOfferCustomerRebook } from "@/lib/rebook-pickup";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !srk) throw new Error("Supabase service role 환경 변수가 설정되지 않았습니다.");
  return createSupabaseClient(url, srk, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const pickupDate = typeof body?.pickupDate === "string" ? body.pickupDate.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
      return NextResponse.json({ success: false, error: "수거일을 선택해 주세요." }, { status: 400 });
    }
    if (isUnavailablePickupDate(pickupDate)) {
      return NextResponse.json({ success: false, error: "주말·공휴일에는 수거할 수 없습니다." }, { status: 400 });
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    const admin = getSupabaseAdmin();
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, status, canceled_at, user_id, customer_name, pickup_address, pickup_address_detail, pickup_zipcode, pickup_phone, customer_phone, delivery_address, delivery_address_detail, delivery_zipcode, delivery_phone, notes, item_name")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ success: false, error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }

    const ownerIds = [userRow?.id, user.id].filter(Boolean);
    if (!ownerIds.includes(order.user_id)) {
      return NextResponse.json({ success: false, error: "본인 주문만 재접수할 수 있습니다." }, { status: 403 });
    }

    const { data: shipment } = await admin
      .from("shipments")
      .select("status, pickup_completed_at, pickup_scheduled_date, tracking_events")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!shouldOfferCustomerRebook({
      status: order.status,
      canceled_at: order.canceled_at,
      pickupDate: order.pickup_date,
      scheduledDate: shipment?.pickup_scheduled_date,
      shipmentStatus: shipment?.status,
      pickupCompletedAt: shipment?.pickup_completed_at,
      trackingEvents: shipment?.tracking_events,
    })) {
      return NextResponse.json(
        { success: false, error: "수거 실패 건만 다시 예약할 수 있습니다." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ success: false, error: "서버 설정 오류입니다." }, { status: 500 });
    }

    const { error: dateErr } = await admin
      .from("orders")
      .update({ pickup_date: pickupDate })
      .eq("id", orderId);
    if (dateErr) {
      return NextResponse.json({ success: false, error: dateErr.message }, { status: 500 });
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/shipments-book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        order_id: order.id,
        customer_name: order.customer_name || "",
        pickup_address: order.pickup_address || "",
        pickup_address_detail: order.pickup_address_detail || "",
        pickup_zipcode: order.pickup_zipcode || "",
        pickup_phone: order.pickup_phone || order.customer_phone || "",
        delivery_address: order.delivery_address || order.pickup_address || "",
        delivery_address_detail: order.delivery_address_detail || order.pickup_address_detail || "",
        delivery_zipcode: order.delivery_zipcode || order.pickup_zipcode || "",
        delivery_phone: order.delivery_phone || order.customer_phone || "",
        delivery_message: order.notes || "",
        goods_name: order.item_name || undefined,
        force_rebook: true,
        pickup_date: pickupDate,
        test_mode: false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return NextResponse.json(
        { success: false, error: data.error || "수거 재접수에 실패했습니다.", code: data.code },
        { status: res.status >= 400 ? res.status : 502 }
      );
    }

    return NextResponse.json({
      success: true,
      trackingNo: data.data?.tracking_no ?? data.data?.pickup_tracking_no ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "수거 재접수 중 오류가 발생했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
