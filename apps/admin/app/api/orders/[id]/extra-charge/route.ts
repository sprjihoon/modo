
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { action, amount, adminNote } = await request.json();

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

    // 2. Approve or Reject using RPC function
    if (action === "APPROVE") {
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: "금액을 입력해주세요" }, { status: 400 });
      }

      // Call approve_extra_charge RPC function
      const { data, error } = await supabase.rpc('approve_extra_charge', {
        p_order_id: params.id,
        p_manager_id: user.id,
        p_price: amount,
        p_note: adminNote || ''
      });

      if (error) {
        console.error("Approve error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // 3. Create Notification for Customer
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
            amount 
          }
        });
      }

      // 4. Log action
      await supabase.from("action_logs").insert({
        actor_id: user.id,
        action_type: "APPROVE_EXTRA_CHARGE",
        details: {
          orderId: params.id,
          amount,
          adminNote,
          result: data
        }
      });

      return NextResponse.json({ success: true, data });

    } else if (action === "REJECT") {
      // Reject: Set status back to NONE or create a reject status
      const { error } = await supabase
        .from("orders")
        .update({
          extra_charge_status: 'NONE',
          status: 'PROCESSING', // Resume work
          updated_at: new Date().toISOString()
        })
        .eq("id", params.id);

      if (error) {
        console.error("Reject error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Log action
      await supabase.from("action_logs").insert({
        actor_id: user.id,
        action_type: "REJECT_EXTRA_CHARGE",
        details: {
          orderId: params.id,
          adminNote
        }
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

