import { corsHeaders } from './cors.ts';

/**
 * Request ID 생성
 */
function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * 성공 응답 (통일된 형식)
 * { success: true, data: {...}, request_id: "uuid" }
 */
export function successResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      request_id: generateRequestId(),
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * 에러 응답 (통일된 형식)
 * { success: false, error: "...", code: "...", request_id: "uuid" }
 */
export function errorResponse(message: string, status = 400, code?: string) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      code: code || `ERROR_${status}`,
      request_id: generateRequestId(),
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

