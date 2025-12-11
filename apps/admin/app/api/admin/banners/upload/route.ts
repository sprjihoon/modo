import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// POST: 배너 이미지 업로드
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "파일이 없습니다." },
        { status: 400 }
      );
    }

    // 이미지 파일 검증
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "이미지 파일만 업로드 가능합니다." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "파일 크기는 5MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `banners/${Date.now()}.${fileExt}`;

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Supabase Storage에 업로드
    const { data, error } = await supabaseAdmin.storage
      .from("public")
      .upload(fileName, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      console.error("이미지 업로드 실패:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Public URL 가져오기
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("public").getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
    });
  } catch (error: any) {
    console.error("이미지 업로드 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

