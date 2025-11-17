/**
 * 우체국 공급지 정보 등록 API (1회성 설정)
 * POST /epost-setup-office
 * 
 * 공급지 = 발송지/회수도착지 정보를 우체국에 등록
 * 이 API는 최초 1회만 실행하면 됩니다
 */

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { seed128Encrypt, buildEpostParams } from '../_shared/seed128.ts';

const EPOST_BASE_URL = 'http://ship.epost.go.kr';

interface SetupOfficeRequest {
  office_ser: string;       // 공급지 코드 (예: "01")
  office_name: string;      // 공급지명
  zipcode: string;          // 우편번호
  address: string;          // 주소
  address_detail: string;   // 상세주소
  tel: string;              // 전화번호
  contact_name: string;     // 담당자명
  mobile?: string;          // 휴대전화
  email?: string;           // 이메일
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    const body: SetupOfficeRequest = await req.json();
    const {
      office_ser,
      office_name,
      zipcode,
      address,
      address_detail,
      tel,
      contact_name,
      mobile,
      email,
    } = body;

    // 환경변수
    const apiKey = Deno.env.get('EPOST_API_KEY');
    const securityKey = Deno.env.get('EPOST_SECURITY_KEY');
    const custNo = Deno.env.get('EPOST_CUSTOMER_ID');

    if (!apiKey || !securityKey || !custNo) {
      return errorResponse('EPost credentials not configured', 500);
    }

    // 공급지 등록 파라미터
    const params = {
      custNo,
      officeSer: office_ser,
      officeNm: office_name,
      officeZip: zipcode,
      officeAddr1: address,
      officeAddr2: address_detail,
      officeTelno: tel.replace(/-/g, ''),
      contactNm: contact_name,
      officeDivCd: '1', // 1: 발송지와 회수도착지 동일
    };

    if (mobile) {
      params.chrgPrsnMob = mobile.replace(/-/g, '');
    }
    if (email) {
      params.chrgPrsnEmail = email;
    }

    // 평문 생성
    const plainText = buildEpostParams(params);
    console.log('📝 공급지 등록 평문:', plainText);

    // 암호화
    const encryptedData = seed128Encrypt(plainText, securityKey);

    // API 호출
    const url = `${EPOST_BASE_URL}/api.InsertOffice.jparcel?key=${apiKey}&regData=${encodeURIComponent(encryptedData)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Connection': 'keep-alive',
        'Host': 'ship.epost.go.kr',
        'User-Agent': 'Apache-HttpClient/4.5.1 (Java/1.8.0_91)',
      },
    });

    const xmlText = await response.text();
    console.log('📥 우체국 응답:', xmlText);

    // 에러 체크
    if (xmlText.includes('<error>')) {
      const errorCode = xmlText.match(/<error_code>(.*?)<\/error_code>/)?.[1];
      const errorMsg = xmlText.match(/<message>(.*?)<\/message>/)?.[1];
      return errorResponse(`공급지 등록 실패: ${errorCode} - ${errorMsg}`, 400);
    }

    // 성공
    const chkResult = xmlText.match(/<chkResult>(.*?)<\/chkResult>/)?.[1];
    const officeSer = xmlText.match(/<officeSer>(.*?)<\/officeSer>/)?.[1];
    const officeNm = xmlText.match(/<officeNm>(.*?)<\/officeNm>/)?.[1];

    return successResponse({
      success: chkResult === 'Y',
      office_ser: officeSer,
      office_name: officeNm,
      message: '공급지 정보가 등록되었습니다',
      xml: xmlText,
    });

  } catch (error) {
    console.error('Setup office error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});


