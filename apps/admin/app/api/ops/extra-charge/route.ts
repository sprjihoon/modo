
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { orderId, reason } = await request.json();

    if (!orderId || !reason) {
      return NextResponse.json(
        { error: "Order ID and reason are required" },
        { status: 400 }
      );
    }

    // 1. Get current user (Worker)
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

    // 3. Insert extra charge request
    const { data, error } = await supabase
      .from("extra_charge_requests")
      .insert({
        order_id: orderId,
        worker_id: user.id,
        worker_reason: reason,
        status: "PENDING"
      })
      .select()
      .single();

    if (error) {
      console.error("Extra charge request error:", error);
      return NextResponse.json(
        { error: "Failed to create request" },
        { status: 500 }
      );
    }

    // 4. Log action
    await supabase.from("action_logs").insert({
      actor_id: user.id,
      action_type: "REQ_EXTRA_CHARGE",
      details: {
        orderId,
        requestId: data.id,
        reason
      }
    });

    // 5. TODO: Notify Managers/Admins (Realtime or Push)

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

