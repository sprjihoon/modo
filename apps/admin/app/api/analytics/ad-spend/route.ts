import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaff } from "@/lib/ops-auth";
import { AD_SPEND_SOURCES, normalizeSource } from "@/lib/ad-performance";

export const dynamic = "force-dynamic";

const ALLOWED = new Set<string>(AD_SPEND_SOURCES.map((row) => row.key));

function missingTable(message: string) {
  return /ad_spend|schema cache|not find/i.test(message);
}

export async function GET() {
  try {
    const auth = await requireStaff();
    if (auth.response) return auth.response;

    const { data, error } = await supabaseAdmin
      .from("ad_spend")
      .select("id, source, campaign, start_date, end_date, amount, note, created_at")
      .order("start_date", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: missingTable(error.message)
            ? "ad_spend 테이블이 없습니다. 마이그레이션을 실행하세요."
            : error.message,
        },
        { status: missingTable(error.message) ? 503 : 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "조회 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (auth.response) return auth.response;

    const body = await request.json();
    const sourceRaw = String(body.source || "").trim();
    const source = normalizeSource(sourceRaw).key;
    const campaign = String(body.campaign || "").trim();
    const startDate = String(body.start_date || body.startDate || "").slice(0, 10);
    const endDate = String(body.end_date || body.endDate || "").slice(0, 10);
    const amount = Number(body.amount);
    const note = String(body.note || "").trim() || null;

    if (!sourceRaw || !ALLOWED.has(source)) {
      return NextResponse.json({ success: false, error: "광고 채널을 선택하세요." }, { status: 400 });
    }
    if (!startDate || !endDate || startDate > endDate) {
      return NextResponse.json({ success: false, error: "광고비 기간이 올바르지 않습니다." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) {
      return NextResponse.json({ success: false, error: "광고비를 확인하세요." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("ad_spend")
      .insert({
        source,
        campaign,
        start_date: startDate,
        end_date: endDate,
        amount: Math.round(amount),
        note,
      })
      .select("id, source, campaign, start_date, end_date, amount, note, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: missingTable(error.message)
            ? "ad_spend 테이블이 없습니다. 마이그레이션을 실행하세요."
            : error.message,
        },
        { status: missingTable(error.message) ? 503 : 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "저장 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (auth.response) return auth.response;

    const id = new URL(request.url).searchParams.get("id") || "";
    if (!id) {
      return NextResponse.json({ success: false, error: "id가 필요합니다." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("ad_spend").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "삭제 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
