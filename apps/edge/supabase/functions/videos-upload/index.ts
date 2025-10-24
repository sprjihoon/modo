/**
 * 영상 업로드 API
 * POST /videos-upload
 * 
 * Cloudflare Stream에 영상 업로드
 */

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

interface VideoUploadRequest {
  tracking_no: string;
  video_type: 'INBOUND' | 'OUTBOUND';
  video_url?: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    // POST 요청만 허용
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    // 요청 본문 파싱
    const body: VideoUploadRequest = await req.json();
    const { tracking_no, video_type, video_url } = body;

    // 필수 필드 검증
    if (!tracking_no || !video_type) {
      return errorResponse('Missing required fields', 400);
    }

    // TODO: Cloudflare Stream API 연동
    // 현재는 Mock 데이터 반환
    const mockVideoId = `VIDEO${Date.now()}`;
    const mockStreamUrl = `https://customer-${Deno.env.get('CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN')}.cloudflarestream.com/${mockVideoId}/manifest/video.m3u8`;
    const mockThumbnailUrl = `https://customer-${Deno.env.get('CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN')}.cloudflarestream.com/${mockVideoId}/thumbnails/thumbnail.jpg`;

    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient(req);

    // 영상 정보 저장
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        tracking_no,
        video_type,
        cloudflare_video_id: mockVideoId,
        stream_url: mockStreamUrl,
        thumbnail_url: mockThumbnailUrl,
        status: 'READY',
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (videoError) {
      console.error('Video insert error:', videoError);
      return errorResponse('Failed to save video', 500);
    }

    // 송장 상태 업데이트
    const statusField = video_type === 'INBOUND' ? 'inbound_video_id' : 'outbound_video_id';
    const newStatus = video_type === 'INBOUND' ? 'INBOUND' : 'READY_TO_SHIP';

    const { error: shipmentError } = await supabase
      .from('shipments')
      .update({
        [statusField]: video.id,
        status: newStatus,
      })
      .eq('tracking_no', tracking_no);

    if (shipmentError) {
      console.error('Shipment update error:', shipmentError);
      return errorResponse('Failed to update shipment', 500);
    }

    // 성공 응답
    return successResponse(
      {
        video_id: mockVideoId,
        stream_url: mockStreamUrl,
        thumbnail_url: mockThumbnailUrl,
        video,
        message: '영상이 업로드되었습니다',
      },
      201
    );

  } catch (error) {
    console.error('Video upload error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

