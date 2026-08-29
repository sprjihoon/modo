import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

type ReviewRow = {
  id: string;
  order_id: string;
  user_id: string;
  rating: number;
  content: string;
  photo_urls: string[] | null;
  status: string;
  display_name: string;
  repair_summary: string | null;
  points_awarded: number;
  points_type: string | null;
  is_featured: boolean;
  display_order: number;
  reviewed_at: string;
  moderated_at: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const status = req.nextUrl.searchParams.get("status") ?? "pending";
    if (!["pending", "approved", "hidden", "all"].includes(status)) {
      return NextResponse.json({ success: false, error: "잘못된 상태입니다." }, { status: 400 });
    }

    let query = supabaseAdmin
      .from("reviews")
      .select(
        "id, order_id, user_id, rating, content, photo_urls, status, display_name, repair_summary, points_awarded, points_type, is_featured, display_order, reviewed_at, moderated_at"
      );

    if (status === "pending") {
      query = query.eq("status", "pending").order("rating", { ascending: true }).order("reviewed_at", { ascending: true });
    } else if (status === "approved") {
      query = query
        .eq("status", "approved")
        .order("is_featured", { ascending: false })
        .order("display_order", { ascending: true })
        .order("reviewed_at", { ascending: false });
    } else if (status !== "all") {
      query = query.eq("status", status).order("reviewed_at", { ascending: false });
    } else {
      query = query.order("reviewed_at", { ascending: false });
    }

    const { data, error } = await query.limit(200);
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || "리뷰 조회 실패" },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as ReviewRow[];
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const orderIds = [...new Set(rows.map((r) => r.order_id))];

    const [{ data: users }, { data: orders }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from("users").select("id, name, email").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; name: string; email: string }[] }),
      orderIds.length
        ? supabaseAdmin.from("orders").select("id, item_name, customer_name").in("id", orderIds)
        : Promise.resolve({ data: [] as { id: string; item_name: string | null; customer_name: string }[] }),
    ]);

    const userMap = new Map((users ?? []).map((u) => [u.id, u]));
    const orderMap = new Map((orders ?? []).map((o) => [o.id, o]));

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        photo_urls: row.photo_urls ?? [],
        is_featured: Boolean(row.is_featured),
        display_order: row.display_order ?? 0,
        customer_name: userMap.get(row.user_id)?.name ?? orderMap.get(row.order_id)?.customer_name ?? "",
        customer_email: userMap.get(row.user_id)?.email ?? "",
        order_item_name: orderMap.get(row.order_id)?.item_name ?? row.repair_summary,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "리뷰 조회 중 오류가 발생했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
