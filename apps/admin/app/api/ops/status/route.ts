import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaff } from "@/lib/ops-auth";
import type { Database } from "@/lib/database.types";

type ShipmentStatus = Database["public"]["Enums"]["shipment_status"];
type OpsStatus = Extract<ShipmentStatus, "PROCESSING" | "READY_TO_SHIP" | "OUT_FOR_DELIVERY" | "DELIVERED">;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (auth.response) return auth.response;

    const body = await request.json();
    const { orderId, status } = body as { orderId?: string; status?: OpsStatus };

    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId and status are required" }, { status: 400 });
    }

    const allowed: OpsStatus[] = ["PROCESSING", "READY_TO_SHIP", "OUT_FOR_DELIVERY", "DELIVERED"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    // shipments + orders 원자적 전환 + 전이 검증 (RPC)
    const { data, error } = await (supabaseAdmin as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    }).rpc("ops_set_status", { p_order_id: orderId, p_status: status });

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, result: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}


