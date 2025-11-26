import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type OpsStatus = "PROCESSING" | "READY_TO_SHIP" | "SHIPPED";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, status } = body as { orderId?: string; status?: OpsStatus };

    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId and status are required" }, { status: 400 });
    }

    const allowed: OpsStatus[] = ["PROCESSING", "READY_TO_SHIP", "SHIPPED"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    // Update shipments
    {
      const { error } = await supabaseAdmin
        .from("shipments")
        .update({ status })
        .eq("order_id", orderId);
      if (error) throw new Error(error.message);
    }

    // Update orders
    {
      const { error } = await supabaseAdmin
        .from("orders")
        .update({ status })
        .eq("id", orderId);
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}


