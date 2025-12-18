import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// POST: 앱 컨텐츠용 이미지 업로드
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
    const fileName = `app-contents/${Date.now()}.${fileExt}`;

    const bucketName = "admin-assets";

    // 버킷이 없으면 생성 시도
    try {
      // @ts-ignore - createBucket only available for service role
      await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"],
      });
    } catch (createError: any) {
      if (createError?.message && !createError.message.includes("already exists")) {
        console.warn("버킷 생성 경고 (이미 존재할 수 있음):", createError);
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: data?.path ?? fileName,
    });
  } catch (error: any) {
    console.error("이미지 업로드 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


