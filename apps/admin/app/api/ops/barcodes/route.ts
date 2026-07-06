import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/ops/barcodes?orderId=...
 * order_barcodes + 주문 기본정보를 서버사이드에서 한번에 반환
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const [bcResult, orderResult] = await Promise.all([
    (supabaseAdmin as any)
      .from("order_barcodes")
      .select("*")
      .eq("order_id", orderId)
      .order("seq") as Promise<{ data: unknown[] | null; error: { message: string } | null }>,
    supabaseAdmin
      .from("orders")
      .select("order_number,customer_name,item_name,repair_parts,created_at")
      .eq("id", orderId)
      .single(),
  ]);

  if (bcResult.error) {
    return NextResponse.json({ error: bcResult.error.message }, { status: 500 });
  }
  if (orderResult.error) {
    return NextResponse.json({ error: orderResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    barcodes: bcResult.data ?? [],
    order: orderResult.data,
  });
}

/**
 * PATCH /api/ops/barcodes?orderId=...
 * printed_at 일괄 갱신
 */
export async function PATCH(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const { error } = await (supabaseAdmin as any)
    .from("order_barcodes")
    .update({ printed_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .is("printed_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
