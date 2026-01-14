import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 결제 내역 조회 API
 * 
 * GET /api/payments?page=1&limit=20&status=COMPLETED&startDate=2024-01-01&endDate=2024-12-31&search=검색어
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    // 쿼리 파라미터
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "ALL";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search") || "";
    const paymentMethod = searchParams.get("paymentMethod") || "ALL";
    
    const offset = (page - 1) * limit;
    
    // 기본 쿼리 - orders에서 결제 관련 정보 조회
    let query = supabase
      .from("orders")
      .select(`
        id,
        created_at,
        customer_name,
        customer_phone,
        customer_email,
        total_price,
        payment_status,
        payment_method,
        payment_key,
        paid_at,
        canceled_at,
        status
      `, { count: "exact" })
      .not("payment_status", "is", null)
      .order("created_at", { ascending: false });
    
    // 상태 필터
    if (status !== "ALL") {
      query = query.eq("payment_status", status);
    }
    
    // 결제 방법 필터
    if (paymentMethod !== "ALL") {
      query = query.eq("payment_method", paymentMethod);
    }
    
    // 날짜 필터
    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00`);
    }
    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59`);
    }
    
    // 검색 필터
    if (search) {
      query = query.or(`id.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,payment_key.ilike.%${search}%`);
    }
    
    // 페이지네이션
    query = query.range(offset, offset + limit - 1);
    
    const { data: orders, error, count } = await query;
    
    if (error) {
      console.error("결제 내역 조회 실패:", error);
      return NextResponse.json(
        { success: false, error: "결제 내역 조회에 실패했습니다." },
        { status: 500 }
      );
    }
    
    // 통계 조회
    const { data: statsData } = await supabase
      .from("orders")
      .select("payment_status, total_price, payment_method")
      .not("payment_status", "is", null);
    
    const stats = {
      total: statsData?.length || 0,
      completed: statsData?.filter(o => o.payment_status === "COMPLETED").length || 0,
      pending: statsData?.filter(o => o.payment_status === "PENDING").length || 0,
      failed: statsData?.filter(o => o.payment_status === "FAILED").length || 0,
      canceled: statsData?.filter(o => o.payment_status === "CANCELED" || o.payment_status === "PARTIAL_CANCELED").length || 0,
      totalRevenue: statsData?.filter(o => o.payment_status === "COMPLETED").reduce((sum, o) => sum + (o.total_price || 0), 0) || 0,
    };
    
    // 결제 데이터 변환
    const payments = orders?.map(order => ({
      id: order.id,
      orderId: order.id,
      customerName: order.customer_name || "고객명 없음",
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      amount: order.total_price || 0,
      method: order.payment_method || "CARD",
      status: order.payment_status || "PENDING",
      paymentKey: order.payment_key,
      orderStatus: order.status,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      canceledAt: order.canceled_at,
    })) || [];
    
    return NextResponse.json({
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      stats,
    });
  } catch (error: any) {
    console.error("결제 내역 조회 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

