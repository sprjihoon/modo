import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "outbound_video";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("media")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    // type 필터 (all이면 전체)
    if (type !== "all") {
      query = query.eq("type", type);
    }

    // 날짜 필터
    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59.999Z`);
    }

    const { data: videos, error, count } = await query;

    if (error) throw new Error(error.message);

    // 모든 shipments 한 번에 가져와 order_id 매핑
    const { data: allShipments } = await supabaseAdmin
      .from("shipments")
      .select("order_id, pickup_tracking_no, delivery_tracking_no");

    const shipmentByTrackingNo = new Map<string, { order_id: string; pickup_tracking_no: string | null; delivery_tracking_no: string | null }>();
    for (const s of allShipments || []) {
      if (s.pickup_tracking_no) shipmentByTrackingNo.set(s.pickup_tracking_no, s);
      if (s.delivery_tracking_no) shipmentByTrackingNo.set(s.delivery_tracking_no, s);
      if (s.order_id) shipmentByTrackingNo.set(s.order_id, s);
    }

    // 검색어 필터링 (search가 있는 경우 in-memory)
    let filtered = videos || [];
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.final_waybill_no?.toLowerCase().includes(lower) ||
          v.path?.toLowerCase().includes(lower)
      );
    }

    // 주문 정보 조인 (order_id 목록 수집 후 일괄 조회)
    const orderIds = new Set<string>();
    for (const v of filtered) {
      const s = shipmentByTrackingNo.get(v.final_waybill_no);
      if (s?.order_id) orderIds.add(s.order_id);
    }

    const orderMap = new Map<string, { order_number: string; customer_name: string | null; item_name: string | null }>();
    if (orderIds.size > 0) {
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, customer_name, item_name")
        .in("id", Array.from(orderIds));
      for (const o of orders || []) {
        orderMap.set(o.id, o);
      }
    }

    const result = filtered.map((v) => {
      const shipment = shipmentByTrackingNo.get(v.final_waybill_no);
      const order = shipment?.order_id ? orderMap.get(shipment.order_id) : null;
      return {
        ...v,
        order_id: shipment?.order_id ?? null,
        pickup_tracking_no: shipment?.pickup_tracking_no ?? null,
        delivery_tracking_no: shipment?.delivery_tracking_no ?? null,
        order_number: order?.order_number ?? null,
        customer_name: order?.customer_name ?? null,
        item_name: order?.item_name ?? null,
      };
    });

    // 타입별 카운트 (현재 활성 타입만)
    const { data: counts } = await supabaseAdmin
      .from("media")
      .select("type");

    const typeCounts: Record<string, number> = {};
    for (const row of counts || []) {
      typeCounts[row.type] = (typeCounts[row.type] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      videos: result,
      total: count ?? filtered.length,
      page,
      limit,
      typeCounts,
    });
  } catch (error: any) {
    console.error("영상 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
