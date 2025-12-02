import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST: 배경 이미지를 Supabase Storage에 업로드
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    // 파일명 생성 (타임스탬프 + 확장자만 사용하여 안전하게)
    const timestamp = Date.now();
    // 파일 확장자 추출 (소문자로 변환)
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
    // 타임스탬프와 확장자만 사용하여 안전한 파일명 생성
    const fileName = `label-background/${timestamp}.${fileExtension}`;

    // 버킷 이름
    const bucketName = "admin-assets";
    
    // 버킷이 없으면 생성 시도 (기존 코드 패턴 참고)
    try {
      // @ts-ignore - createBucket only available for service role
      await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
      });
    } catch (createError: any) {
      // 버킷이 이미 존재하면 무시 (에러 코드 확인 필요)
      if (createError?.message && !createError.message.includes("already exists")) {
        console.warn("Bucket creation warning (may already exist):", createError);
      }
    }

    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ 
        error: `업로드 실패: ${uploadError.message}. Storage 버킷 '${bucketName}'을 확인해주세요.` 
      }, { status: 500 });
    }

    // Public URL 가져오기
    const { data: urlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // 데이터베이스에 URL 저장 (company_info 테이블 사용)
    // 먼저 기존 레코드 확인
    const { data: existingData, error: checkError } = await supabaseAdmin
      .from("company_info")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Check error:", checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
      label_background_image_url: publicUrl,
    };

    let dbError;
    if (existingData && existingData.id) {
      // 레코드가 있으면 업데이트
      const { error: updateError } = await supabaseAdmin
        .from("company_info")
        .update(updateData)
        .eq("id", existingData.id);

      dbError = updateError;
    } else {
      // 레코드가 없으면 삽입
      const { error: insertError } = await supabaseAdmin
        .from("company_info")
        .insert(updateData);

      dbError = insertError;
    }

    if (dbError) {
      console.error("Database error:", dbError);
      // 컬럼이 없으면 명확한 안내 메시지
      if (dbError.code === "42703" || dbError.message?.includes("column") || dbError.message?.includes("schema cache")) {
        return NextResponse.json({ 
          error: "컬럼이 없습니다. Supabase Dashboard → Table Editor → company_info 테이블 선택 → 상단 'Add Column' 클릭 → Name: label_background_image_url, Type: text, Nullable: 체크 → Save",
          needsMigration: true
        }, { status: 500 });
      }
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      fileName: uploadData.path 
    });
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

