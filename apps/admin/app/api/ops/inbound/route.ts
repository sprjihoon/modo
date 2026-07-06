import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateOrderBarcodes } from "@/lib/barcode";

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
    let outboundErrorMsg: string | null = null; // 에러 메시지 저장용

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

      console.log("📡 Edge Function 응답:", outboundResponse.status);
      
      if (outboundResponse.ok) {
        const outboundResult = await outboundResponse.json();
        console.log("📦 응답 데이터:", JSON.stringify(outboundResult, null, 2));
        outboundTrackingNo = outboundResult.data?.trackingNo || null;
        console.log("✅ 출고 송장 생성 성공:", outboundTrackingNo);
        
        // delivery_info도 저장 (집배코드 등 포함) - shipments 테이블에서 조회
        console.log("📋 출고 송장 생성 응답 상세:", outboundResult.data);
      } else {
        // 에러 응답 파싱
        const errorText = await outboundResponse.text();
        console.error("❌ 출고 송장 생성 실패:", errorText);
        try {
          const errorJson = JSON.parse(errorText);
          outboundErrorMsg = errorJson.error || errorText;
        } catch {
          outboundErrorMsg = errorText;
        }
      }
    } catch (outboundError: any) {
      console.error("❌ Edge Function 호출 오류:", outboundError.message);
      outboundErrorMsg = outboundError.message;
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

    // 4. 내부 바코드 자동 생성
    let barcodesGenerated = 0;
    let barcodeError: string | null = null;

    const { data: orderForBarcode } = await supabaseAdmin
      .from("orders")
      .select("order_number, repair_parts")
      .eq("id", orderId)
      .single();

    if (orderForBarcode?.order_number) {
      const repairParts: unknown[] = Array.isArray(orderForBarcode.repair_parts)
        ? orderForBarcode.repair_parts
        : [];
      const { rows, error: bcErr } = await generateOrderBarcodes(
        supabaseAdmin,
        orderId,
        orderForBarcode.order_number,
        repairParts,
      );
      barcodesGenerated = rows.length;
      barcodeError = bcErr;
    }

    return NextResponse.json({
      success: true,
      message: "입고 처리가 완료되었습니다",
      outboundTrackingNo,
      barcodesGenerated,
      error: outboundErrorMsg ?? barcodeError,
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

