import { corsHeaders } from './cors.ts';

/**
 * 성공 응답
 */
export function successResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * 에러 응답
 */
export function errorResponse(message: string, status = 400) {
  return new Response(
    JSON.stringify({
      error: message,
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

