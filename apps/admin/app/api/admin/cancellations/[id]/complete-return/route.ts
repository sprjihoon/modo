import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * 관리자/매니저가 반송 처리 완료를 표시.
 * - mark_return_completed RPC 호출 (status = RETURN_DONE 으로 전이)
 * - 고객에게 알림 (status 변경 trigger 가 처리 — 별도 호출 불필요하지만 안전하게 명시 insert)
 * - ADMIN/MANAGER 들에게도 알림 (서로 처리 상황을 공유)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await supabase
      .from("users")
      .select("id, role, name")
      .eq("auth_id", session.user.id)
      .maybeSingle();
    if (!actor || !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(actor.role)) {
      return NextResponse.json(
        { error: "반송 완료 처리 권한이 없습니다." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const note: string | undefined = body?.note;

    // 1) RPC 호출 → status = RETURN_DONE
    // (Supabase 자동 생성 타입에 신규 RPC 가 아직 반영되지 않아 any 캐스팅으로 우회)
    const { data: rpcResult, error: rpcErr } = await (supabaseAdmin.rpc as any)(
      "mark_return_completed",
      {
        p_order_id: orderId,
        p_actor_id: actor.id,
        p_note: note ?? null,
      },
    );
    if (rpcErr) {
      console.error("mark_return_completed RPC error:", rpcErr);
      return NextResponse.json(
        { error: rpcErr.message || "반송 완료 처리 실패" },
        { status: 500 },
      );
    }

    // 2) 주문 정보 — 알림 본문 구성용
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, item_name, user_id")
      .eq("id", orderId)
      .maybeSingle();

    const itemName = order?.item_name ?? "수선 의류";
    const orderNumber = order?.order_number ?? orderId.slice(0, 8);

    // 3) 고객 알림 (status 변경 trigger 가 자동 발생시키는 것에 더해, 명시적 안내 1건)
    if (order?.user_id) {
      try {
        await supabaseAdmin.from("notifications").insert({
          user_id: order.user_id,
          type: "RETURN_COMPLETED",
          title: "반송 처리 완료",
          body: `'${itemName}' (주문 ${orderNumber}) 의 반송 처리가 완료되었습니다.${
            note ? `\n관리자 메모: ${note}` : ""
          }`,
          order_id: orderId,
          metadata: {
            orderId,
            orderNumber,
            handledBy: actor.id,
            handledByName: actor.name,
            note: note ?? "",
          },
        });
      } catch (e) {
        console.warn("고객 RETURN_COMPLETED 알림 실패 (무시):", e);
      }
    }

    // 4) ADMIN/MANAGER 들에게도 fan-out (액터 본인 제외)
    try {
      const { data: managers } = await supabaseAdmin
        .from("users")
        .select("id")
        .in("role", ["ADMIN", "MANAGER", "SUPER_ADMIN"]);
      const targets = (managers ?? []).filter((m) => m.id !== actor.id);
      if (targets.length > 0) {
        const rows = targets.map((m) => ({
          user_id: m.id,
          type: "ADMIN_RETURN_COMPLETED",
          title: "반송 처리 완료",
          body: `'${itemName}' (주문 ${orderNumber}) 의 반송이 ${
            actor.name ?? "관리자"
          }에 의해 완료 처리되었습니다.`,
          order_id: orderId,
          metadata: {
            orderId,
            orderNumber,
            handledBy: actor.id,
            handledByName: actor.name,
            customer_user_id: order?.user_id ?? null,
          },
        }));
        await supabaseAdmin.from("notifications").insert(rows);
      }
    } catch (e) {
      console.warn("관리자 fan-out 알림 실패 (무시):", e);
    }

    return NextResponse.json({
      success: true,
      result: rpcResult,
    });
  } catch (e) {
    console.error("complete-return error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
