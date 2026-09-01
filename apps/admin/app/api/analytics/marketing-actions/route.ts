import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/ops-auth";
import { loadMarketingActions } from "@/lib/marketing-actions-data";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 200;

function trimList<T>(rows: T[]): T[] {
  return rows.slice(0, LIST_LIMIT);
}

export async function GET() {
  try {
    const auth = await requireStaff();
    if (auth.response) return auth.response;

    const { actions, creatives } = await loadMarketingActions();

    return NextResponse.json({
      success: true,
      data: {
        ...actions,
        quiet30: trimList(actions.quiet30),
        quiet60: trimList(actions.quiet60),
        oneShot: trimList(actions.oneShot),
        abandon: trimList(actions.abandon),
        appOnly: trimList(actions.appOnly),
        creatives,
      },
    });
  } catch (error: any) {
    console.error("마케팅 실행 API 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
