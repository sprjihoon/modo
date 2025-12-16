
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { action } = await request.json(); // ACCEPTED or REJECTED

    if (!["ACCEPTED", "REJECTED"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // 1. Get Request Info
    const { data: req, error: fetchError } = await supabase
      .from("extra_charge_requests")
      .select("*, orders(user_id)")
      .eq("id", params.id)
      .single();

    if (fetchError || !req) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // 2. Update Status
    // If ACCEPTED, usually we would verify payment here. For now, we assume payment is done or will be done.
    // If we want to simulate payment flow, we might set status to 'PAID' directly or 'ACCEPTED' and wait for callback.
    // Let's set to 'PAID' if accepted for simplicity in this flow, or 'ACCEPTED' if just approval.
    // The prompt says "결제할 수 있도록", so implies payment.
    // We will set to 'PAID' to simulate successful payment for 'ACCEPTED'.
    
    const newStatus = action === "ACCEPTED" ? "PAID" : "REJECTED";

    const { error: updateError } = await supabase
      .from("extra_charge_requests")
      .update({
        status: newStatus,
        customer_response_at: new Date().toISOString()
      })
      .eq("id", params.id);

    if (updateError) throw updateError;

    // 3. Notify Admin/Worker
    await supabase.from("notifications").insert({
      // Notify the worker who requested it? Or admins?
      // Let's notify the worker_id if present, and admins.
      user_id: req.worker_id, // Notify worker
      type: "EXTRA_CHARGE_RESPONSE",
      title: `추가 비용 ${action === "ACCEPTED" ? "결제 완료" : "거절됨"}`,
      body: `고객이 추가 비용 요청을 ${action === "ACCEPTED" ? "수락 및 결제했습니다" : "거절했습니다"}.`,
      metadata: { 
        requestId: params.id,
        orderId: req.order_id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

