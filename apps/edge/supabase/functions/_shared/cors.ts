/**
 * CORS 헤더 설정
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * OPTIONS 요청 처리
 */
export function handleCorsOptions() {
  return new Response('ok', {
    headers: corsHeaders,
  });
}

