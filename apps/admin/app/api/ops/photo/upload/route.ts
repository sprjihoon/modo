import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/ops/photo/upload
 *
 * 수선전(before_photo) / 수선후(after_photo) 사진 업로드
 * multipart/form-data:
 *   - file: 이미지 파일
 *   - orderId: 주문 ID
 *   - sequence: 수선 항목 순서 (1-based)
 *   - photoType: "before_photo" | "after_photo"
 *   - finalWaybillNo: 송장번호 (media 테이블 key)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const orderId = formData.get("orderId") as string | null;
    const sequence = parseInt((formData.get("sequence") as string) || "1");
    const photoType = (formData.get("photoType") as string) || "before_photo";
    const finalWaybillNo = formData.get("finalWaybillNo") as string | null;

    if (!file || !orderId) {
      return NextResponse.json(
        { error: "file, orderId는 필수입니다" },
        { status: 400 }
      );
    }

    if (!["before_photo", "after_photo"].includes(photoType)) {
      return NextResponse.json(
        { error: "photoType은 before_photo 또는 after_photo 여야 합니다" },
        { status: 400 }
      );
    }

    // 송장번호 조회 (finalWaybillNo가 없으면 DB에서 가져오기)
    let waybillNo = finalWaybillNo;
    if (!waybillNo) {
      const { data: shipment } = await supabaseAdmin
        .from("shipments")
        .select("pickup_tracking_no, tracking_no, delivery_tracking_no")
        .eq("order_id", orderId)
        .maybeSingle();

      waybillNo =
        shipment?.pickup_tracking_no ||
        shipment?.tracking_no ||
        orderId;
    }

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Supabase Storage에 업로드
    // 경로: repair-photos/{orderId}/{photoType}_{sequence}_{timestamp}.{ext}
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const timestamp = Date.now();
    const fileName = `${photoType}_${sequence}_${timestamp}.${ext}`;
    const storagePath = `${orderId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("repair-photos")
      .upload(storagePath, uint8Array, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage 업로드 실패:", uploadError);
      return NextResponse.json(
        { error: `Storage 업로드 실패: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 공개 URL 생성
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("repair-photos")
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData?.publicUrl;

    // 기존 동일 항목 사진 조회 → Storage 파일 + DB 레코드 모두 삭제 (재촬영 덮어쓰기)
    const { data: oldRecords } = await supabaseAdmin
      .from("media")
      .select("id, path")
      .eq("final_waybill_no", waybillNo)
      .eq("type", photoType)
      .eq("sequence", sequence);

    if (oldRecords && oldRecords.length > 0) {
      // Storage 파일 삭제
      const oldPaths = oldRecords.map((r) => r.path).filter(Boolean);
      if (oldPaths.length > 0) {
        const { error: storageDelErr } = await supabaseAdmin.storage
          .from("repair-photos")
          .remove(oldPaths);
        if (storageDelErr) {
          console.warn("⚠️ Storage 이전 파일 삭제 실패 (계속 진행):", storageDelErr.message);
        } else {
          console.log(`✅ Storage 이전 파일 ${oldPaths.length}개 삭제:`, oldPaths);
        }
      }
      // DB 레코드 삭제
      await supabaseAdmin
        .from("media")
        .delete()
        .eq("final_waybill_no", waybillNo)
        .eq("type", photoType)
        .eq("sequence", sequence);
    }

    // media 테이블에 기록
    const { data: mediaRecord, error: dbError } = await supabaseAdmin
      .from("media")
      .insert({
        final_waybill_no: waybillNo,
        path: storagePath,
        provider: "supabase",
        type: photoType,
        sequence,
      })
      .select()
      .single();

    if (dbError) {
      console.error("media 테이블 저장 실패:", dbError);
      // Storage 파일은 업로드됐으므로 일단 성공 응답
    }

    return NextResponse.json({
      success: true,
      path: storagePath,
      url: publicUrl,
      mediaId: mediaRecord?.id,
      photoType,
      sequence,
    });
  } catch (error: any) {
    console.error("사진 업로드 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ops/photo/upload?orderId=xxx
 * 주문의 수선전/후 사진 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json({ error: "orderId 필수" }, { status: 400 });
    }

    // 송장번호 조회
    const { data: shipment } = await supabaseAdmin
      .from("shipments")
      .select("pickup_tracking_no, tracking_no, delivery_tracking_no")
      .eq("order_id", orderId)
      .maybeSingle();

    const candidates = [
      shipment?.pickup_tracking_no,
      shipment?.tracking_no,
      shipment?.delivery_tracking_no,
      orderId,
    ].filter(Boolean) as string[];

    const { data: photos, error } = await supabaseAdmin
      .from("media")
      .select("id, path, type, sequence, created_at, provider")
      .in("final_waybill_no", candidates)
      .in("type", ["before_photo", "after_photo"])
      .order("sequence", { ascending: true });

    if (error) throw error;

    // 공개 URL 생성 및 sequence별 그룹화
    const bySequence: Record<number, { before?: string; after?: string; beforeId?: string; afterId?: string }> = {};

    for (const p of photos || []) {
      const seq = p.sequence || 1;
      if (!bySequence[seq]) bySequence[seq] = {};

      const url = supabaseAdmin.storage
        .from("repair-photos")
        .getPublicUrl(p.path).data.publicUrl;

      if (p.type === "before_photo") {
        bySequence[seq].before = url;
        bySequence[seq].beforeId = p.id;
      } else if (p.type === "after_photo") {
        bySequence[seq].after = url;
        bySequence[seq].afterId = p.id;
      }
    }

    return NextResponse.json({ success: true, photos: bySequence, raw: photos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
