import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// 센터 콘솔: 작업자 본인의 작업 내역 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. 로그인 확인
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // 2. 사용자 정보 조회
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, email, name, role")
      .eq("auth_id", session.user.id)
      .maybeSingle();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 3. 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // PENDING, IN_PROGRESS, COMPLETED
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    // 4. 작업자 본인의 작업 내역만 조회
    let query = supabaseAdmin
      .from("work_items")
      .select("*")
      .eq("worker_id", userData.id)  // 본인의 작업만
      .order("created_at", { ascending: false });

    // 필터링
    if (status) {
      query = query.eq("status", status);
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

    // 5. orders 정보 조회
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

    // 6. work_items에 orders 정보 추가
    const data = (workItems || []).map((item: any) => ({
      ...item,
      orders: ordersData[item.order_id] || null,
    }));

    // 7. 전체 개수 조회
    let countQuery = supabaseAdmin
      .from("work_items")
      .select("*", { count: "exact", head: true })
      .eq("worker_id", userData.id);  // 본인의 작업만

    if (status) {
      countQuery = countQuery.eq("status", status);
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

