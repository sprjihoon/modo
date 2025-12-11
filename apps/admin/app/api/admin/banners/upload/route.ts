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

    // 버킷 이름 (admin-assets 사용 또는 생성)
    const bucketName = "admin-assets";

    // 버킷이 없으면 생성 시도
    try {
      // @ts-ignore - createBucket only available for service role
      await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
      });
      console.log(`✅ 버킷 생성 성공: ${bucketName}`);
    } catch (createError: any) {
      // 버킷이 이미 존재하면 무시
      if (createError?.message && !createError.message.includes("already exists")) {
        console.warn("버킷 생성 경고 (이미 존재할 수 있음):", createError);
      }
    }

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Supabase Storage에 업로드
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
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
    } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName);

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

