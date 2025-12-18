
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { orderId, reason, amount, note } = await request.json();

    if (!orderId || !reason) {
      return NextResponse.json(
        { error: "Order ID and reason are required" },
        { status: 400 }
      );
    }

    // 1. Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get user info to confirm role
    const { data: user } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_id", session.user.id)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 3. Call RPC function to request extra charge
    // 작업자(WORKER): reason만 전달 -> PENDING_MANAGER
    // 관리자(MANAGER/ADMIN): reason + amount + note 전달 -> PENDING_CUSTOMER (Direct Pass)
    const { data, error } = await supabase.rpc('request_extra_charge', {
      p_order_id: orderId,
      p_user_id: user.id,
      p_memo: reason,
      p_price: amount || null,
      p_note: note || null
    });

    if (error) {
      console.error("Extra charge request error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create request" },
        { status: 500 }
      );
    }

    // 4. Log action
    await supabase.from("action_logs").insert({
      actor_id: user.id,
      action_type: "REQ_EXTRA_CHARGE",
      details: {
        orderId,
        reason,
        amount,
        userRole: user.role,
        result: data
      }
    });

    // 5. TODO: Notify Managers/Admins or Customer (Realtime or Push)

    return NextResponse.json({ 
      success: true, 
      data,
      message: user.role === 'WORKER' 
        ? '관리자 승인 대기 중입니다.' 
        : '고객에게 추가 결제 요청을 보냈습니다.'
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

