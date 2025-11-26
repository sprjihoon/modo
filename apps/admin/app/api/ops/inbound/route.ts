import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "order_id is required" },
        { status: 400 }
      );
    }

    // shipments 테이블 업데이트
    const { error: shipmentError } = await supabaseAdmin
      .from("shipments")
      .update({
        status: "INBOUND",
        // inbound_at: new Date().toISOString(), // 필드 추가 필요
      })
      .eq("order_id", orderId);

    if (shipmentError) {
      throw new Error(shipmentError.message);
    }

    // orders 테이블 업데이트
    const { error: orderError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "INBOUND",
      })
      .eq("id", orderId);

    if (orderError) {
      throw new Error(orderError.message);
    }

    return NextResponse.json({
      success: true,
      message: "입고 처리가 완료되었습니다",
    });
  } catch (error: any) {
    console.error("입고 처리 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// 입고 취소(BOOKED로 되돌리기)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "order_id is required" },
        { status: 400 }
      );
    }

    const { error: shipmentError } = await supabaseAdmin
      .from("shipments")
      .update({ status: "BOOKED" })
      .eq("order_id", orderId);

    if (shipmentError) {
      throw new Error(shipmentError.message);
    }

    const { error: orderError } = await supabaseAdmin
      .from("orders")
      .update({ status: "BOOKED" })
      .eq("id", orderId);

    if (orderError) {
      throw new Error(orderError.message);
    }

    return NextResponse.json({
      success: true,
      message: "입고 처리 취소(BOOKED로 되돌리기) 완료",
    });
  } catch (error: any) {
    console.error("입고 취소 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

