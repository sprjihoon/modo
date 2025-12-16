
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { requestId, action, amount, adminNote } = await request.json();

    // 1. Auth check (Admin/Manager only)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: user } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_id", session.user.id)
      .single();

    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(user?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Update Request
    const status = action === "APPROVE" ? "REVIEWED" : "REJECTED"; // REVIEWED = Waiting for customer
    
    const { error } = await supabase
      .from("extra_charge_requests")
      .update({
        status,
        amount: amount || 0,
        admin_note: adminNote,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq("id", requestId)
      .eq("order_id", params.id);

    if (error) throw error;

    // 3. If Approved, Create Notification for Customer
    if (status === "REVIEWED") {
      const { data: order } = await supabase
        .from("orders")
        .select("user_id, item_name")
        .eq("id", params.id)
        .single();

      if (order?.user_id) {
        await supabase.from("notifications").insert({
          user_id: order.user_id,
          type: "EXTRA_CHARGE_REQUEST",
          title: "추가 결제 요청",
          body: `'${order.item_name}' 수선 작업 중 추가 비용(${amount?.toLocaleString()}원)이 발생했습니다. 확인 후 결제해주세요.`,
          metadata: { 
            orderId: params.id, 
            requestId,
            amount 
          }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

