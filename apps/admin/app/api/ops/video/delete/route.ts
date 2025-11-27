import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/ops/video/delete
 * 
 * Cloudflare Stream 영상 및 DB 레코드 삭제
 * 
 * Body: { videoId: string } 또는 { mediaId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, mediaId } = body;

    if (!videoId && !mediaId) {
      return NextResponse.json(
        { error: "videoId or mediaId is required" },
        { status: 400 }
      );
    }

    console.log("🗑️ 영상 삭제 시작:", { videoId, mediaId });

    // 1. DB에서 영상 정보 조회
    let media;
    if (mediaId) {
      const { data } = await supabaseAdmin
        .from("media")
        .select("*")
        .eq("id", mediaId)
        .single();
      media = data;
    } else if (videoId) {
      const { data } = await supabaseAdmin
        .from("media")
        .select("*")
        .eq("path", videoId)
        .eq("provider", "cloudflare")
        .single();
      media = data;
    }

    if (!media) {
      console.warn("⚠️ 영상을 찾을 수 없습니다");
      return NextResponse.json({ success: true, message: "영상이 이미 삭제되었거나 존재하지 않습니다" });
    }

    // 2. Cloudflare Stream 영상 삭제
    if (media.provider === "cloudflare" && media.path) {
      try {
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = process.env.CLOUDFLARE_STREAM_TOKEN;

        if (accountId && apiToken) {
          const deleteUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${media.path}`;
          const deleteResponse = await fetch(deleteUrl, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${apiToken}`,
            },
          });

          if (deleteResponse.ok) {
            console.log("✅ Cloudflare Stream 영상 삭제 성공:", media.path);
          } else {
            const errorText = await deleteResponse.text();
            console.warn("⚠️ Cloudflare 삭제 실패 (계속 진행):", errorText);
          }
        }
      } catch (cloudflareError) {
        console.warn("⚠️ Cloudflare 삭제 오류 (계속 진행):", cloudflareError);
      }
    }

    // 3. DB 레코드 삭제
    const { error: deleteError } = await supabaseAdmin
      .from("media")
      .delete()
      .eq("id", media.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    console.log("✅ DB 레코드 삭제 성공:", media.id);

    return NextResponse.json({
      success: true,
      message: "영상이 삭제되었습니다",
    });
  } catch (error: any) {
    console.error("❌ 영상 삭제 오류:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

