
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { action } = await request.json(); // ACCEPTED or REJECTED

    if (!["ACCEPTED", "REJECTED"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // 1. Get Request Info
    const { data: req, error: fetchError } = await supabase
      .from("extra_charge_requests")
      .select("*, orders(user_id)")
      .eq("id", id)
      .single();

    if (fetchError || !req) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const newStatus = action === "ACCEPTED" ? "PAID" : "REJECTED";

    const { error: updateError } = await supabase
      .from("extra_charge_requests")
      .update({
        status: newStatus,
        customer_response_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateError) throw updateError;

    // 3. Notify Admin/Worker
    await supabase.from("notifications").insert({
      user_id: req.worker_id,
      type: "EXTRA_CHARGE_RESPONSE",
      title: `추가 비용 ${action === "ACCEPTED" ? "결제 완료" : "거절됨"}`,
      body: `고객이 추가 비용 요청을 ${action === "ACCEPTED" ? "수락 및 결제했습니다" : "거절했습니다"}.`,
      metadata: { 
        requestId: id,
        orderId: req.order_id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
