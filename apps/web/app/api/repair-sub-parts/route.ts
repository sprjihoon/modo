import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repairTypeId = searchParams.get("repair_type_id");

    if (!repairTypeId) {
      return NextResponse.json({ error: "repair_type_id is required", data: [] }, { status: 200 });
    }

    const supabase = await createClient();

    let { data, error } = await supabase
      .from("repair_sub_parts")
      .select("*")
      .eq("repair_type_id", repairTypeId)
      .order("display_order", { ascending: true });

    // display_order 컬럼 없는 경우 폴백
    if (error) {
      console.error("repair_sub_parts query error:", error.message);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("repair_sub_parts")
        .select("*")
        .eq("repair_type_id", repairTypeId);

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message, data: [] }, { status: 200 });
      }
      data = fallbackData;
    }

    const rows = (data ?? []).filter((row) => {
      const partType = (row as { part_type?: string | null }).part_type;
      return partType == null || partType === "sub_part";
    });

    return NextResponse.json({ data: rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg, data: [] }, { status: 200 });
  }
}
