
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Auth check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get order with extra_charge_status and extra_charge_data
    const { data: order, error } = await supabase
      .from("orders")
      .select("extra_charge_status, extra_charge_data")
      .eq("id", params.id)
      .single();

    if (error) throw error;

    // Format as requests array for backward compatibility
    const requests = [];
    
    if (order && order.extra_charge_status !== 'NONE' && order.extra_charge_data) {
      const data = order.extra_charge_data;
      
      // Get worker/manager name
      let workerName = "알 수 없음";
      if (data.requestedBy) {
        const { data: user } = await supabase
          .from("users")
          .select("name")
          .eq("id", data.requestedBy)
          .single();
        if (user) workerName = user.name;
      }

      requests.push({
        id: params.id, // Use order ID as request ID
        order_id: params.id,
        worker_reason: data.workerMemo || "",
        amount: data.managerPrice || 0,
        admin_note: data.managerNote || "",
        status: order.extra_charge_status === 'PENDING_MANAGER' ? 'PENDING' : 
                order.extra_charge_status === 'PENDING_CUSTOMER' ? 'REVIEWED' : 
                order.extra_charge_status,
        requested_at: data.requestedAt || new Date().toISOString(),
        reviewed_at: data.approvedAt,
        worker_name: workerName
      });
    }

    return NextResponse.json({ requests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

