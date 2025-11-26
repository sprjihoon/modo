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

    // 1. 출고 송장 생성 (Edge Function 호출)
    let outboundTrackingNo: string | null = null;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      console.log("📮 출고 송장 생성 Edge Function 호출...");
      const outboundResponse = await fetch(`${supabaseUrl}/functions/v1/shipments-create-outbound`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ orderId }),
      });

      if (outboundResponse.ok) {
        const outboundResult = await outboundResponse.json();
        outboundTrackingNo = outboundResult.data?.trackingNo || null;
        console.log("✅ 출고 송장 생성 성공:", outboundTrackingNo);
      } else {
        const errorText = await outboundResponse.text();
        console.warn("⚠️ 출고 송장 생성 실패 (계속 진행):", errorText);
      }
    } catch (outboundError) {
      console.warn("⚠️ 출고 송장 생성 실패 (계속 진행):", outboundError);
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

