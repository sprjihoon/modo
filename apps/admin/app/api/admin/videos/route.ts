import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: videos, error } = await supabaseAdmin
      .from("media")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      videos: videos || [],
    });
  } catch (error: any) {
    console.error("영상 조회 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

