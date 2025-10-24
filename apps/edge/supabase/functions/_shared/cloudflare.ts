/**
 * Cloudflare Stream API 연동
 * https://developers.cloudflare.com/stream/
 */

const CF_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
const CF_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN');
const CF_STREAM_SUBDOMAIN = Deno.env.get('CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN') || 'demo';

interface DirectUploadResponse {
  upload_url: string;
  video_id: string;
}

interface VideoInfo {
  video_id: string;
  stream_url: string;
  thumbnail_url: string;
  status: string;
  duration?: number;
}

/**
 * Direct Creator Upload URL 생성
 * 클라이언트가 이 URL로 직접 업로드
 */
export async function getDirectUploadUrl(
  maxDurationSeconds: number = 3600
): Promise<DirectUploadResponse> {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    throw new Error('Cloudflare credentials not configured');
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/direct_upload`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds,
        requireSignedURLs: false,
        allowedOrigins: ['*'],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Cloudflare API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Failed to get upload URL');
  }

  return {
    upload_url: data.result.uploadURL,
    video_id: data.result.uid,
  };
}

/**
 * 영상 URL로 업로드 (서버 측 업로드)
 */
export async function uploadVideoFromUrl(videoUrl: string): Promise<VideoInfo> {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    throw new Error('Cloudflare credentials not configured');
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/copy`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: videoUrl,
        requireSignedURLs: false,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Cloudflare upload error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Video upload failed');
  }

  const video = data.result;

  return {
    video_id: video.uid,
    stream_url: `https://customer-${CF_STREAM_SUBDOMAIN}.cloudflarestream.com/${video.uid}/manifest/video.m3u8`,
    thumbnail_url: `https://customer-${CF_STREAM_SUBDOMAIN}.cloudflarestream.com/${video.uid}/thumbnails/thumbnail.jpg`,
    status: video.status?.state || 'processing',
    duration: video.duration,
  };
}

/**
 * 영상 정보 조회
 */
export async function getVideoInfo(videoId: string): Promise<VideoInfo> {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    throw new Error('Cloudflare credentials not configured');
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${videoId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Video not found');
  }

  const data = await response.json();
  const video = data.result;

  return {
    video_id: video.uid,
    stream_url: `https://customer-${CF_STREAM_SUBDOMAIN}.cloudflarestream.com/${video.uid}/manifest/video.m3u8`,
    thumbnail_url: `https://customer-${CF_STREAM_SUBDOMAIN}.cloudflarestream.com/${video.uid}/thumbnails/thumbnail.jpg`,
    status: video.status?.state || 'unknown',
    duration: video.duration,
  };
}

/**
 * Mock Cloudflare Stream (개발용)
 */
export function mockCloudflareUpload(trackingNo: string): VideoInfo {
  const videoId = `VIDEO${Date.now()}${Math.floor(Math.random() * 1000)}`;
  
  return {
    video_id: videoId,
    stream_url: `https://customer-${CF_STREAM_SUBDOMAIN}.cloudflarestream.com/${videoId}/manifest/video.m3u8`,
    thumbnail_url: `https://customer-${CF_STREAM_SUBDOMAIN}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`,
    status: 'ready',
  };
}

