import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// 작업 내역 조회 (주문 정보와 함께)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const status = searchParams.get("status"); // PENDING, IN_PROGRESS, COMPLETED
    const workerName = searchParams.get("workerName");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    // work_items 조회
    let query = supabaseAdmin
      .from("work_items")
      .select("*")
      .order("created_at", { ascending: false });

    // 필터링
    if (orderId) {
      query = query.eq("order_id", orderId);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (workerName) {
      query = query.ilike("worker_name", `%${workerName}%`);
    }
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    // 페이지네이션
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: workItems, error } = await query;

    if (error) {
      console.error("작업 내역 조회 오류:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // orders 정보 조회 (work_items의 order_id들을 모아서 한 번에 조회)
    const orderIds = [...new Set((workItems || []).map((item: any) => item.order_id))];
    let ordersData: Record<string, any> = {};
    
    if (orderIds.length > 0) {
      const { data: orders, error: ordersError } = await supabaseAdmin
        .from("orders")
        .select("id, tracking_no, customer_name, item_name, status")
        .in("id", orderIds);

      if (ordersError) {
        console.error("주문 정보 조회 오류:", ordersError);
      } else {
        // orders를 id로 매핑
        (orders || []).forEach((order: any) => {
          ordersData[order.id] = order;
        });
      }
    }

    // work_items에 orders 정보 추가
    const data = (workItems || []).map((item: any) => ({
      ...item,
      orders: ordersData[item.order_id] || null,
    }));

    // 전체 개수 조회
    let countQuery = supabaseAdmin
      .from("work_items")
      .select("*", { count: "exact", head: true });

    if (orderId) {
      countQuery = countQuery.eq("order_id", orderId);
    }
    if (status) {
      countQuery = countQuery.eq("status", status);
    }
    if (workerName) {
      countQuery = countQuery.ilike("worker_name", `%${workerName}%`);
    }
    if (startDate) {
      countQuery = countQuery.gte("created_at", startDate);
    }
    if (endDate) {
      countQuery = countQuery.lte("created_at", endDate);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        pageSize,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / pageSize),
      },
    });
  } catch (error: any) {
    console.error("작업 내역 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

