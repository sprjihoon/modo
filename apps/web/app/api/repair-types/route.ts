import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");

    const supabase = createClient();

    // select("*") 로 컬럼명 불일치 오류 방지 (모바일 앱과 동일 방식)
    // is_active 필터는 기존 데이터가 null인 경우 빈 결과를 낼 수 있어 제외
    let query = supabase.from("repair_types").select("*");

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    // display_order 정렬 시도
    let { data, error } = await query.order("display_order", { ascending: true });

    // display_order 컬럼 없으면 정렬 없이 재시도
    if (error) {
      console.error("repair_types query error:", error.message);
      let fallback = supabase.from("repair_types").select("*");
      if (categoryId) fallback = fallback.eq("category_id", categoryId);
      const { data: fallbackData, error: fallbackError } = await fallback;

      if (fallbackError) {
        console.error("repair_types fallback error:", fallbackError.message);
        return NextResponse.json({ error: fallbackError.message, data: [] }, { status: 200 });
      }
      data = fallbackData;
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg, data: [] }, { status: 200 });
  }
}
