import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// GET: 모든 콘텐츠 조회
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("app_contents")
      .select("key, title, content, updated_at")
      .order("key");

    if (error) {
      console.error("콘텐츠 조회 오류:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error("콘텐츠 조회 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: 콘텐츠 저장/수정
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, content } = body;

    if (!key) {
      return NextResponse.json(
        { success: false, error: "key is required" },
        { status: 400 }
      );
    }

    // upsert: 있으면 업데이트, 없으면 삽입
    const { data, error } = await supabaseAdmin
      .from("app_contents")
      .upsert(
        {
          key,
          title: key === "price_list" ? "가격표" : key === "easy_guide" ? "쉬운가이드" : key,
          content: content || "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      )
      .select()
      .single();

    if (error) {
      console.error("콘텐츠 저장 오류:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("콘텐츠 저장 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

