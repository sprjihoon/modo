import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");

    const supabase = createClient();

    // display_order 로 정렬 시도, 없으면 created_at
    const selectColumns = "id, name, price, description, category_id";

    let query = supabase.from("repair_types").select(selectColumns);

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    // 정렬: display_order 우선, 실패시 별도 쿼리로 재시도 불필요 (데이터 자체 확인)
    const { data, error } = await query;

    if (error) {
      console.error("repair_types query error:", error.message);
      return NextResponse.json({ error: error.message, data: [] }, { status: 200 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg, data: [] }, { status: 200 });
  }
}
