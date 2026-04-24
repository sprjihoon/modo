import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function fetchOrdersByFilter(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filter?: { column: string; value: string }
) {
  const cols = "id, status, extra_charge_status, item_name, clothing_type, total_price, created_at, pickup_date";
  const colsFallback = "id, status, extra_charge_status, item_name, clothing_type, total_price, created_at";

  const buildQuery = (selectCols: string) => {
    let q = supabase.from("orders").select(selectCols).order("created_at", { ascending: false });
    if (filter) q = q.eq(filter.column, filter.value) as typeof q;
    return q;
  };

  const { data, error } = await buildQuery(cols);
  if (error) {
    const { data: fallback } = await buildQuery(colsFallback);
    return (fallback ?? []) as unknown as Record<string, unknown>[];
  }
  return (data ?? []) as unknown as Record<string, unknown>[];
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    let rows: Record<string, unknown>[] = [];

    if (userRow?.id) {
      rows = await fetchOrdersByFilter(supabase, { column: "user_id", value: userRow.id as string });
    }

    if (rows.length === 0) {
      rows = await fetchOrdersByFilter(supabase, { column: "user_id", value: user.id });
    }

    const unique = Array.from(new Map(rows.map((o) => [o.id, o])).values());
    unique.sort((a, b) =>
      new Date((b.created_at as string) ?? 0).getTime() - new Date((a.created_at as string) ?? 0).getTime()
    );

    return NextResponse.json({ orders: unique });
  } catch (e) {
    console.error("Orders GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST 는 제거됨 (PENDING_PAYMENT 폐지).
//   - 결제 필요 주문: POST /api/orders/quote → /payment 흐름 사용
//   - 0원 주문:       POST /api/orders/free  사용
