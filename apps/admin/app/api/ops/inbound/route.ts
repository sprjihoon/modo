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

    console.log("📦 입고 처리 시작:", orderId);

    // 1. 출고 송장 생성 (임시: Mock 모드)
    let outboundTrackingNo: string | null = null;
    try {
      // 임시 테스트 송장번호 생성
      const timestamp = Date.now();
      const mockTrackingNo = `TEST-OUT-${timestamp.toString().substring(3)}`;
      outboundTrackingNo = mockTrackingNo;
      
      console.log("✅ 출고 송장 생성 (MOCK):", outboundTrackingNo);
      
      // shipments 테이블에 직접 저장
      const { error: updateTrackingError } = await supabaseAdmin
        .from("shipments")
        .update({ delivery_tracking_no: outboundTrackingNo })
        .eq("order_id", orderId);
      
      if (updateTrackingError) {
        console.error("❌ delivery_tracking_no 업데이트 실패:", updateTrackingError);
        outboundTrackingNo = null;
      }
    } catch (outboundError) {
      console.warn("⚠️ 출고 송장 생성 실패 (계속 진행):", outboundError);
      outboundTrackingNo = null;
    }

    // 2. shipments 테이블 업데이트
    const { error: shipmentError } = await supabaseAdmin
      .from("shipments")
      .update({
        status: "INBOUND",
      })
      .eq("order_id", orderId);

    if (shipmentError) {
      throw new Error(shipmentError.message);
    }

    // 3. orders 테이블 업데이트
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
      outboundTrackingNo,
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

