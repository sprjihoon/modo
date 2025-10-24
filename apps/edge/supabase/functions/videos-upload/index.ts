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
      return errorResponse('Missing required fields', 400, 'MISSING_FIELDS');
    }

    // video_type 검증
    if (video_type !== 'INBOUND' && video_type !== 'OUTBOUND') {
      return errorResponse('Invalid video_type', 400, 'INVALID_VIDEO_TYPE');
    }

    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient(req);

    // 송장 존재 확인
    const { data: existingShipment, error: shipmentCheckError } = await supabase
      .from('shipments')
      .select('id, tracking_no, status')
      .eq('tracking_no', tracking_no)
      .single();

    if (shipmentCheckError || !existingShipment) {
      return errorResponse('Shipment not found', 404, 'SHIPMENT_NOT_FOUND');
    }

    // TODO: Cloudflare Stream API 연동
    // const uploadUrl = await getCloudflareDirectUploadUrl();
    // return { upload_url: uploadUrl } // Direct Upload 방식
    // 또는
    // const uploadResult = await uploadToCloudflareStream(video_url);
    // const { videoId, streamUrl } = uploadResult;

    // 현재는 Mock 데이터
    const mockVideoId = `VIDEO${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const subdomain = Deno.env.get('CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN') || 'demo';
    const mockStreamUrl = `https://customer-${subdomain}.cloudflarestream.com/${mockVideoId}/manifest/video.m3u8`;
    const mockThumbnailUrl = `https://customer-${subdomain}.cloudflarestream.com/${mockVideoId}/thumbnails/thumbnail.jpg`;

    // 영상 정보 저장 (upsert)
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .upsert({
        tracking_no,
        video_type,
        cloudflare_video_id: mockVideoId,
        stream_url: mockStreamUrl,
        thumbnail_url: mockThumbnailUrl,
        status: 'READY',
        uploaded_at: new Date().toISOString(),
      }, {
        onConflict: 'tracking_no,video_type',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (videoError) {
      console.error('Video upsert error:', videoError);
      return errorResponse('Failed to save video', 500, 'DB_ERROR');
    }

    // 송장 상태 업데이트
    const statusField = video_type === 'INBOUND' ? 'inbound_video_id' : 'outbound_video_id';
    const newStatus = video_type === 'INBOUND' ? 'INBOUND' : 'READY_TO_SHIP';

    const updateData: any = {
      [statusField]: video.id,
      status: newStatus,
    };

    const { error: shipmentError } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('tracking_no', tracking_no);

    if (shipmentError) {
      console.error('Shipment update error:', shipmentError);
      return errorResponse('Failed to update shipment', 500, 'DB_ERROR');
    }

    // 주문 상태도 업데이트
    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('tracking_no', tracking_no);

    if (orderError) {
      console.error('Order update error:', orderError);
      // 주문 업데이트 실패는 전체 프로세스를 중단하지 않음
    }

    // 알림 생성
    const notificationTitle = video_type === 'INBOUND' ? '입고 완료' : '출고 완료';
    const notificationBody = video_type === 'INBOUND' 
      ? '고객님의 의류가 입고되었습니다. 영상을 확인해보세요.'
      : '수선이 완료되어 출고되었습니다. 영상을 확인해보세요.';

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: existingShipment.order_id, // TODO: 실제 user_id 가져오기
        type: video_type === 'INBOUND' ? 'INBOUND_VIDEO' : 'OUTBOUND_VIDEO',
        title: notificationTitle,
        body: notificationBody,
        tracking_no,
        data: {
          video_url: mockStreamUrl,
          video_type,
        },
      });

    if (notificationError) {
      console.error('Notification insert error:', notificationError);
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

