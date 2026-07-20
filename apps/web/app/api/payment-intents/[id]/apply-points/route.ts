import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const MIN_POINTS = 1000;

function admin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * POST /api/payment-intents/[id]/apply-points
 * body: { pointsToUse: number }  // 0이면 해제, 사용 시 최저 1000
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: intentId } = await params;
    const body = await request.json().catch(() => ({}));
    const pointsToUse = Number(body?.pointsToUse ?? 0);

    if (!Number.isInteger(pointsToUse) || pointsToUse < 0) {
      return NextResponse.json(
        { error: "포인트는 0 이상의 정수여야 합니다." },
        { status: 400 }
      );
    }
    if (pointsToUse > 0 && pointsToUse < MIN_POINTS) {
      return NextResponse.json(
        { error: `포인트는 ${MIN_POINTS.toLocaleString("ko-KR")}P 이상부터 사용할 수 있습니다.` },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const svc = admin();
    const { data: userRow } = await svc
      .from("users")
      .select("id, point_balance")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!userRow?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data, error } = await svc.rpc("apply_points_to_payment_intent", {
      p_intent_id: intentId,
      p_user_id: userRow.id,
      p_points: pointsToUse,
    });

    if (error) {
      const msg = error.message || "";
      const map: Record<string, string> = {
        MIN_POINTS: `포인트는 ${MIN_POINTS.toLocaleString("ko-KR")}P 이상부터 사용할 수 있습니다.`,
        BALANCE_TOO_LOW: `포인트가 ${MIN_POINTS.toLocaleString("ko-KR")}P 이상일 때만 사용할 수 있습니다.`,
        INSUFFICIENT_POINTS: "보유 포인트가 부족합니다.",
        EXCEEDS_TOTAL: "결제 금액을 초과해 포인트를 사용할 수 없습니다.",
        INTENT_EXPIRED: "결제 시간이 만료되었습니다. 주문을 다시 시작해주세요.",
        INTENT_CONSUMED: "이미 처리된 결제입니다.",
        FORBIDDEN: "권한이 없습니다.",
        INTENT_NOT_FOUND: "결제 정보를 찾을 수 없습니다.",
      };
      const key = Object.keys(map).find((k) => msg.includes(k));
      console.error("[apply-points]", error);
      return NextResponse.json(
        { error: key ? map[key] : "포인트 적용에 실패했습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("[apply-points]", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
