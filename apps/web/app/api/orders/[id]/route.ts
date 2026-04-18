import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { status } = body;

    const allowedTransitions: Record<string, string[]> = {
      CANCELLED: ["PENDING_PAYMENT"],
    };

    if (!status || !allowedTransitions[status]) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // 본인 주문인지 확인
    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, user_id")
      .eq("id", params.id)
      .maybeSingle();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const ownerIds = [userRow?.id, user.id].filter(Boolean);
    if (!ownerIds.includes(order.user_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!allowedTransitions[status].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${order.status} to ${status}` },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", params.id);

    if (updateError) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Order PATCH error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
