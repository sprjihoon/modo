import { supabase } from '../supabase';

/**
 * 영상 업로드 (Edge Function 호출)
 */
export async function uploadVideo(
  trackingNo: string,
  videoType: 'INBOUND' | 'OUTBOUND',
  videoUrl?: string
) {
  const { data, error } = await supabase.functions.invoke('videos-upload', {
    body: {
      tracking_no: trackingNo,
      video_type: videoType,
      video_url: videoUrl,
    },
  });

  if (error) throw error;
  
  if (!data.success) {
    throw new Error(data.error || 'Upload failed');
  }

  return data.data;
}

/**
 * 영상 목록 조회
 */
export async function getVideosByTrackingNo(trackingNo: string) {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('tracking_no', trackingNo)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Direct Upload URL 요청 (Cloudflare)
 */
export async function getDirectUploadUrl() {
  // TODO: Cloudflare Direct Upload URL 생성 Edge Function
  const { data, error } = await supabase.functions.invoke('videos-get-upload-url');

  if (error) throw error;
  return data.upload_url;
}

