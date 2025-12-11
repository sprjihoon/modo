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

    let query = supabaseAdmin
      .from("work_items")
      .select(`
        *,
        orders:order_id (
          id,
          order_number,
          customer_name,
          item_name,
          repair_parts,
          status
        )
      `)
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

    const { data, error, count } = await query;

    if (error) {
      console.error("작업 내역 조회 오류:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

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

