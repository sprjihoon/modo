/**
 * 우체국 API 설정 관리
 */

import type { EPostConfig } from './types.ts';

const EPOST_BASE_URL = 'http://ship.epost.go.kr';

/**
 * 우체국 API 설정 가져오기
 * 환경 변수 검증 강화 버전
 */
export function getEPostConfig(): EPostConfig {
  const apiKey = Deno.env.get('EPOST_API_KEY');
  const securityKey = Deno.env.get('EPOST_SECURITY_KEY');
  const custNo = Deno.env.get('EPOST_CUSTOMER_ID') || '';

  console.log('🔑 환경 변수 확인:', {
    hasApiKey: !!apiKey,
    hasSecurityKey: !!securityKey,
    custNo: custNo || '(미설정)',
    custNoLength: custNo?.length || 0,
    apiKeyLength: apiKey?.length || 0,
    securityKeyLength: securityKey?.length || 0,
  });

  // 1. API KEY 검증 (최소 10자 이상)
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error(
      'EPOST_API_KEY가 유효하지 않습니다. ' +
      '최소 10자 이상의 API 키가 필요합니다. ' +
      'Supabase Dashboard → Settings → Edge Functions → Secrets에서 설정하세요.'
    );
  }

  // 2. SECURITY KEY 검증 (정확히 16자, SEED128 표준)
  if (!securityKey || securityKey.length !== 16) {
    throw new Error(
      'EPOST_SECURITY_KEY가 유효하지 않습니다. ' +
      'SEED128 암호화를 위해 정확히 16자의 보안키가 필요합니다. ' +
      `현재 길이: ${securityKey?.length || 0}자. ` +
      'Supabase Dashboard → Settings → Edge Functions → Secrets에서 설정하세요.'
    );
  }

  // 3. 고객번호 검증 (공백 제거 및 최소 길이)
  const trimmedCustNo = custNo.trim();
  if (!trimmedCustNo || trimmedCustNo.length === 0) {
    throw new Error(
      'EPOST_CUSTOMER_ID가 설정되지 않았습니다. ' +
      '우체국 계약 시 발급받은 고객번호를 설정하세요. ' +
      'Supabase Dashboard → Settings → Edge Functions → Secrets에서 설정하세요.'
    );
  }

  // 고객번호 최소 길이 검증 (일반적으로 8-12자)
  if (trimmedCustNo.length < 4) {
    throw new Error(
      `EPOST_CUSTOMER_ID가 너무 짧습니다 (현재: ${trimmedCustNo.length}자). ` +
      '유효한 고객번호를 확인하세요.'
    );
  }

  // 테스트 고객번호 경고
  if (trimmedCustNo === 'vovok1122') {
    console.warn(
      '⚠️ 기본 테스트 고객번호(vovok1122)를 사용 중입니다. ' +
      '실제 우체국 계약 시 발급받은 고객번호로 변경하세요.'
    );
  }

  // 환경 변수 검증 완료 로그
  console.log('✅ 우체국 API 환경 변수 검증 완료:', {
    apiKeyValid: true,
    securityKeyValid: true,
    custNoValid: true,
    custNo: trimmedCustNo,
    isTestMode: trimmedCustNo === 'vovok1122',
  });

  return { 
    apiKey: apiKey.trim(), 
    securityKey, 
    custNo: trimmedCustNo 
  };
}

/**
 * 우체국 API 기본 URL
 */
export function getEPostBaseUrl(): string {
  return EPOST_BASE_URL;
}

