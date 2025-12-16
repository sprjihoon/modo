
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

    const { data: requests, error } = await supabase
      .from("extra_charge_requests")
      .select(`
        *,
        worker:worker_id (name)
      `)
      .eq("order_id", params.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = requests.map(r => ({
      ...r,
      worker_name: r.worker?.name || "알 수 없음"
    }));

    return NextResponse.json({ requests: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

