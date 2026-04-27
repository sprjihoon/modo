import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * 관리자/센터 콘솔 공용 — 취소·반송 큐 목록 + 통계 카운트
 *
 * 쿼리:
 *   - kind: ALL | PRE_PICKUP_CANCEL | RETURN_REQUESTED | RETURN_PENDING | RETURN_SHIPPING | RETURN_DONE
 *   - search: 주문번호/송장/고객명
 *   - startDate, endDate: ISO date (yyyy-mm-dd)
 *   - page, pageSize
 *   - countOnly: 'true' 면 통계만 반환 (대시보드 카드용)
 *
 * queue_kind 정의 (DB view cancellation_queue 기준):
 *   - PRE_PICKUP_CANCEL : status = CANCELLED (수거 전 취소, 환불 완료)
 *   - RETURN_REQUESTED  : extra_charge_status = RETURN_REQUESTED 만 — 워크플로우 상으로는 RETURN_PENDING 이 함께 셋팅되므로 실제로는 거의 RETURN_PENDING 우선 매칭됨
 *   - RETURN_PENDING    : status = RETURN_PENDING (반송 송장 발급 대기)
 *   - RETURN_SHIPPING   : 송장 발급 후 반송 배송중
 *   - RETURN_DONE       : 반송 처리 완료
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_id", session.user.id)
      .maybeSingle();
    if (!actor || !["SUPER_ADMIN", "ADMIN", "MANAGER", "WORKER"].includes(actor.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const kind = (sp.get("kind") || "ALL").toUpperCase();
    const search = (sp.get("search") || "").replace(/[(),]/g, "").trim().slice(0, 100);
    const startDate = sp.get("startDate");
    const endDate = sp.get("endDate");
    const countOnly = sp.get("countOnly") === "true";
    const page = Math.max(1, parseInt(sp.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "20")));

    // 통계 쿼리 (queue_kind 별 카운트)
    const { data: statsRows, error: statsErr } = await supabaseAdmin
      .from("cancellation_queue")
      .select("queue_kind");
    if (statsErr) {
      console.error("[cancellations] stats error:", statsErr);
    }
    const stats = {
      total: statsRows?.length ?? 0,
      preCancel: statsRows?.filter((r) => r.queue_kind === "PRE_PICKUP_CANCEL").length ?? 0,
      returnPending: statsRows?.filter((r) => r.queue_kind === "RETURN_PENDING").length ?? 0,
      returnShipping: statsRows?.filter((r) => r.queue_kind === "RETURN_SHIPPING").length ?? 0,
      returnDone: statsRows?.filter((r) => r.queue_kind === "RETURN_DONE").length ?? 0,
      returnRequestedOnly:
        statsRows?.filter((r) => r.queue_kind === "RETURN_REQUESTED").length ?? 0,
      // 처리 대기 = 반송 흐름이지만 아직 완료되지 않은 건
      pending:
        (statsRows?.filter(
          (r) =>
            r.queue_kind === "RETURN_PENDING" ||
            r.queue_kind === "RETURN_SHIPPING" ||
            r.queue_kind === "RETURN_REQUESTED",
        ).length ?? 0),
    };

    if (countOnly) {
      return NextResponse.json({ success: true, stats });
    }

    let query = supabaseAdmin
      .from("cancellation_queue")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false });

    if (kind && kind !== "ALL") {
      if (kind === "PENDING") {
        // 처리 대기 = 아직 반송 완료가 아닌 모든 활성 건
        query = query.in("queue_kind", [
          "RETURN_PENDING",
          "RETURN_SHIPPING",
          "RETURN_REQUESTED",
        ]);
      } else {
        // PRE_PICKUP_CANCEL, RETURN_PENDING, RETURN_SHIPPING, RETURN_DONE, RETURN_REQUESTED
        query = query.eq("queue_kind", kind);
      }
    }

    if (startDate) query = query.gte("updated_at", `${startDate}T00:00:00`);
    if (endDate) query = query.lte("updated_at", `${endDate}T23:59:59`);

    if (search) {
      const v = `%${search}%`;
      query = query.or(
        `order_number.ilike.${v},customer_name.ilike.${v},customer_email.ilike.${v},tracking_no.ilike.${v},item_name.ilike.${v}`,
      );
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;
    if (error) {
      console.error("[cancellations] list error:", error);
      return NextResponse.json({ error: "조회 실패" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
      stats,
      totalCount: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (e) {
    console.error("[cancellations] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
