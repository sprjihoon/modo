/**
 * 우체국 API 설정 관리
 */

import type { EPostConfig } from './types.ts';

const EPOST_BASE_URL = 'http://ship.epost.go.kr';

/**
 * 우체국 API 설정 가져오기
 */
export function getEPostConfig(): EPostConfig {
  const apiKey = Deno.env.get('EPOST_API_KEY');
  const securityKey = Deno.env.get('EPOST_SECURITY_KEY');
  const custNo = Deno.env.get('EPOST_CUSTOMER_ID') || 'vovok1122';

  console.log('🔑 환경 변수 확인:', {
    hasApiKey: !!apiKey,
    hasSecurityKey: !!securityKey,
    custNo: custNo,
    custNoLength: custNo?.length || 0,
    apiKeyLength: apiKey?.length || 0,
    securityKeyLength: securityKey?.length || 0,
  });

  if (!apiKey) {
    throw new Error('EPOST_API_KEY 환경 변수가 설정되지 않았습니다. Supabase Dashboard → Settings → Edge Functions → Secrets에서 설정하세요.');
  }
  if (!securityKey) {
    throw new Error('EPOST_SECURITY_KEY 환경 변수가 설정되지 않았습니다. Supabase Dashboard → Settings → Edge Functions → Secrets에서 설정하세요.');
  }
  if (!custNo || custNo.trim() === '') {
    throw new Error('EPOST_CUSTOMER_ID 환경 변수가 설정되지 않았습니다. Supabase Dashboard → Settings → Edge Functions → Secrets에서 설정하세요.');
  }

  // 고객번호 형식 검증 (공백 제거 및 기본 검증)
  const trimmedCustNo = custNo.trim();
  if (trimmedCustNo.length === 0) {
    throw new Error('EPOST_CUSTOMER_ID가 비어있습니다. 유효한 고객번호를 설정하세요.');
  }

  return { apiKey, securityKey, custNo: trimmedCustNo };
}

/**
 * 우체국 API 기본 URL
 */
export function getEPostBaseUrl(): string {
  return EPOST_BASE_URL;
}

