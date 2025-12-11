import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 작업 아이템 상태 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("work_items")
      .select("*")
      .eq("order_id", orderId)
      .order("item_index", { ascending: true });

    if (error) {
      console.error("작업 아이템 조회 오류:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error("작업 아이템 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// 작업 시작
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, itemIndex, itemName, workerId, workerName } = body;

    if (!orderId || itemIndex === undefined || !itemName) {
      return NextResponse.json(
        { error: "orderId, itemIndex, and itemName are required" },
        { status: 400 }
      );
    }

    // 이미 작업 중인지 확인
    const { data: existing } = await supabaseAdmin
      .from("work_items")
      .select("*")
      .eq("order_id", orderId)
      .eq("item_index", itemIndex)
      .single();

    if (existing && existing.status === "IN_PROGRESS") {
      return NextResponse.json(
        { error: "이미 작업이 시작된 아이템입니다." },
        { status: 400 }
      );
    }

    // 작업 아이템 생성 또는 업데이트
    const workItemData: any = {
      order_id: orderId,
      item_index: itemIndex,
      item_name: itemName,
      status: "IN_PROGRESS",
      started_at: new Date().toISOString(),
    };

    if (workerId) {
      workItemData.worker_id = workerId;
    }
    if (workerName) {
      workItemData.worker_name = workerName;
    }

    let result;
    if (existing) {
      // 기존 레코드 업데이트
      const { data, error } = await supabaseAdmin
        .from("work_items")
        .update(workItemData)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // 새 레코드 생성
      const { data, error } = await supabaseAdmin
        .from("work_items")
        .insert(workItemData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // 주문 상태를 "수선중(PROCESSING)"으로 업데이트
    const { error: orderUpdateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "PROCESSING" })
      .eq("id", orderId);

    if (orderUpdateError) {
      console.error("주문 상태 업데이트 오류:", orderUpdateError);
      // 작업 아이템은 이미 생성되었으므로 에러를 무시하고 계속 진행
    }

    // shipments 상태도 "수선중(PROCESSING)"으로 업데이트
    const { error: shipmentUpdateError } = await supabaseAdmin
      .from("shipments")
      .update({ status: "PROCESSING" })
      .eq("order_id", orderId);

    if (shipmentUpdateError) {
      console.error("배송 상태 업데이트 오류:", shipmentUpdateError);
      // 작업 아이템은 이미 생성되었으므로 에러를 무시하고 계속 진행
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("작업 시작 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// 작업 완료 / 작업 중으로 되돌리기
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, itemIndex, action } = body; // action: "complete" | "reopen"

    if (!orderId || itemIndex === undefined) {
      return NextResponse.json(
        { error: "orderId and itemIndex are required" },
        { status: 400 }
      );
    }

    // 작업 아이템 조회
    const { data: workItem, error: fetchError } = await supabaseAdmin
      .from("work_items")
      .select("*")
      .eq("order_id", orderId)
      .eq("item_index", itemIndex)
      .single();

    if (fetchError || !workItem) {
      return NextResponse.json(
        { error: "작업 아이템을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // action이 "reopen"이면 대기 상태로 되돌리기 (작업 시작 전으로)
    if (action === "reopen") {
      if (workItem.status !== "COMPLETED") {
        return NextResponse.json(
          { error: "완료된 아이템만 다시 대기 상태로 되돌릴 수 있습니다." },
          { status: 400 }
        );
      }

      // 대기 상태로 되돌리기 (시작/완료 시간 초기화)
      const { data, error } = await supabaseAdmin
        .from("work_items")
        .update({
          status: "PENDING",
          started_at: null,
          completed_at: null,
        })
        .eq("id", workItem.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: data,
      });
    }

    // 기본 동작: 작업 완료
    if (workItem.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "작업 중인 아이템만 완료할 수 있습니다." },
        { status: 400 }
      );
    }

    // 작업 완료 처리
    const { data, error } = await supabaseAdmin
      .from("work_items")
      .update({
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
      })
      .eq("id", workItem.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error: any) {
    console.error("작업 상태 변경 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

