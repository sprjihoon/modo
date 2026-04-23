/**
 * CORS 허용 출처 목록
 */
const ALLOWED_ORIGINS = new Set([
  'https://modo.mom',
  'https://admin.modo.mom',
  'https://www.modo.mom',
]);

/**
 * 요청 출처에 따라 CORS 헤더 반환
 * 허용된 출처면 해당 출처를 반영하고, 개발 환경(localhost)도 허용
 */
export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin') || '';
  const isAllowed =
    ALLOWED_ORIGINS.has(origin) ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://modo.mom',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

/**
 * 하위 호환용 헤더 - 기존 함수들의 하위 호환성 유지
 * 관리자 전용/결제 관련 민감한 엔드포인트는 getCorsHeaders(req)를 사용하세요
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * OPTIONS 요청 처리
 */
export function handleCorsOptions(req?: Request) {
  return new Response('ok', {
    headers: getCorsHeaders(req),
  });
}

