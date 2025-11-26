import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingNo: string }> | { trackingNo: string } }
) {
  try {
    // Next.js 15+에서는 params가 Promise일 수 있음
    const resolvedParams = await Promise.resolve(params);
    const trackingNo = resolvedParams.trackingNo;

    if (!trackingNo) {
      return NextResponse.json(
        { error: "trackingNo is required" },
        { status: 400 }
      );
    }

    console.log("🔍 API Route - 송장 조회:", trackingNo);

    // shipments 테이블에서 조회
    const { data: shipment, error: shipmentError } = await supabaseAdmin
      .from("shipments")
      .select("*")
      .or(`pickup_tracking_no.eq.${trackingNo},tracking_no.eq.${trackingNo}`)
      .single();

    console.log("📦 Shipment 조회 결과:", { shipment, error: shipmentError });

    if (shipmentError || !shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    // orders 테이블에서 별도 조회
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", shipment.order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        shipment,
        order,
      },
    });
  } catch (error: any) {
    console.error("Shipment 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

