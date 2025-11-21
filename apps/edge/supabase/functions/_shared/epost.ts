/**
 * 우체국 계약소포 OpenAPI 연동
 * http://ship.epost.go.kr
 * 
 * 참고: 우체국 계약소포 OpenAPI 매뉴얼 (2023.12)
 */

import { seed128Encrypt, buildEpostParams } from './seed128.ts';

const EPOST_BASE_URL = 'http://ship.epost.go.kr';

interface EPostConfig {
  apiKey: string;      // 인증키
  securityKey: string; // 보안키 (SEED128 암호화용)
  custNo: string;      // 고객번호
}

/**
 * 우체국 API 설정 가져오기
 */
function getEPostConfig(): EPostConfig {
  const apiKey = Deno.env.get('EPOST_API_KEY');
  const securityKey = Deno.env.get('EPOST_SECURITY_KEY');
  const custNo = Deno.env.get('EPOST_CUSTOMER_ID') || 'vovok1122';

  console.log('🔑 환경 변수 확인:', {
    hasApiKey: !!apiKey,
    hasSecurityKey: !!securityKey,
    custNo: custNo,
    apiKeyLength: apiKey?.length || 0,
    securityKeyLength: securityKey?.length || 0,
  });

  if (!apiKey) {
    throw new Error('EPOST_API_KEY 환경 변수가 설정되지 않았습니다. Supabase Dashboard → Settings → Edge Functions → Secrets에서 설정하세요.');
  }
  if (!securityKey) {
    throw new Error('EPOST_SECURITY_KEY 환경 변수가 설정되지 않았습니다. Supabase Dashboard → Settings → Edge Functions → Secrets에서 설정하세요.');
  }
  if (!custNo) {
    throw new Error('EPOST_CUSTOMER_ID 환경 변수가 설정되지 않았습니다.');
  }

  return { apiKey, securityKey, custNo };
}

/**
 * 우체국 API 호출 (공통)
 * @param endpoint API 메시지명 (예: api.InsertOrder.jparcel)
 * @param params 암호화할 파라미터 객체
 * @param needsEncryption 암호화 여부
 */
async function callEPostAPI(
  endpoint: string,
  params: Record<string, any>,
  needsEncryption = true,
  testYn?: string
): Promise<any> {
  const config = getEPostConfig();

  let url = `${EPOST_BASE_URL}/${endpoint}?key=${config.apiKey}`;
  
  // testYn이 'Y'이면 URL 파라미터로 추가
  if (testYn === 'Y') {
    url += '&testYn=Y';
  }

  if (needsEncryption) {
    // 파라미터를 문자열로 변환
    console.log('📋 원본 파라미터:', JSON.stringify(params, null, 2));
    const plainText = buildEpostParams(params);
    console.log('📝 암호화할 평문 (전체):', plainText);
    console.log('📝 암호화할 평문 (길이):', plainText.length);
    
    // 평문을 Base64로 인코딩해서 확인 (디버깅용)
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(plainText);
      const base64Preview = btoa(String.fromCharCode(...data)).substring(0, 100);
      console.log('📝 평문 Base64 미리보기:', base64Preview);
    } catch (e) {
      console.warn('⚠️ Base64 인코딩 실패:', e);
    }
    
    // 평문을 파싱하여 각 파라미터 검증
    const paramPairs = plainText.split('&');
    console.log('🔍 파라미터 쌍 개수:', paramPairs.length);
    console.log('🔍 파라미터 쌍 전체 (JSON):', JSON.stringify(paramPairs, null, 2));
    console.log('🔍 파라미터 쌍 전체 (텍스트):', paramPairs.join('\n'));
    
    // 각 파라미터 쌍을 개별적으로 출력
    paramPairs.forEach((pair, index) => {
      console.log(`  [${index}] ${pair}`);
    });
    
    const invalidParams: string[] = [];
    const paramMap: Record<string, string> = {};
    
    for (const pair of paramPairs) {
      const equalIndex = pair.indexOf('=');
      if (equalIndex === -1) {
        console.warn('⚠️ 잘못된 파라미터 형식 (등호 없음):', pair);
        continue;
      }
      
      const key = pair.substring(0, equalIndex);
      const value = pair.substring(equalIndex + 1);
      
      // "Y3" 같은 잘못된 값 패턴 먼저 검사
      if (/^Y\d+$/.test(value) || /^\d+Y$/.test(value) || /^[YN]\d+$/.test(value) || /^\d+[YN]$/.test(value)) {
        invalidParams.push(`${key}=${value} (잘못된 형식: Y/N과 숫자가 합쳐짐)`);
        console.error(`❌ 🚨 잘못된 값 패턴 발견: ${key}=${value}`);
        console.error(`   이전 파라미터: ${paramPairs[paramPairs.indexOf(pair) - 1]}`);
        console.error(`   다음 파라미터: ${paramPairs[paramPairs.indexOf(pair) + 1]}`);
      }
      
      paramMap[key] = value;
      
      // 숫자 필드 검증
      if (['weight', 'volume', 'insuAmt'].includes(key)) {
        const numValue = Number(value);
        if (isNaN(numValue) || numValue <= 0) {
          invalidParams.push(`${key}=${value} (숫자가 아님)`);
          console.error(`❌ 숫자 필드 ${key}에 잘못된 값: "${value}"`);
        } else {
          console.log(`✅ ${key}=${value} (숫자 확인됨)`);
        }
      }
      
      // Y/N 필드 검증 (testYn은 이미 제거되어야 함)
      if (['microYn', 'printYn', 'insuYn'].includes(key)) {
        if (value !== 'Y' && value !== 'N') {
          invalidParams.push(`${key}=${value} (Y 또는 N이 아님)`);
          console.error(`❌ Y/N 필드 ${key}에 잘못된 값: "${value}"`);
        } else {
          console.log(`✅ ${key}=${value} (Y/N 확인됨)`);
        }
      }
      
      // testYn이 있으면 에러
      if (key === 'testYn') {
        invalidParams.push(`${key}=${value} (testYn은 제거되어야 함)`);
        console.error(`❌ 🚨 testYn 파라미터가 여전히 존재함: ${value}`);
      }
    }
    
    console.log('📊 파라미터 맵 (전체):', JSON.stringify(paramMap, null, 2));
    console.log('📊 파라미터 맵 (키 목록):', Object.keys(paramMap).join(', '));
    
    if (invalidParams.length > 0) {
      console.error('❌ 잘못된 파라미터 값들:', invalidParams);
      throw new Error(`Invalid parameter values: ${invalidParams.join(', ')}`);
    }

    // SEED128 암호화
    const encryptedData = seed128Encrypt(plainText, config.securityKey);
    console.log('🔐 암호화 데이터:', encryptedData.substring(0, 50) + '...');

    url += `&regData=${encodeURIComponent(encryptedData)}`;
  } else {
    // 암호화 없이 파라미터 추가
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url += `&${key}=${encodeURIComponent(value)}`;
      }
    });
  }

  console.log('🌐 우체국 API 호출:', endpoint);
  console.log('📡 URL:', url.substring(0, 100) + '...');

  // HTTP 호출 (GET/POST 둘 다 지원)
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Connection': 'keep-alive',
      'Host': 'ship.epost.go.kr',
      'User-Agent': 'Apache-HttpClient/4.5.1 (Java/1.8.0_91)',
      'Accept': 'application/xml, text/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`EPost API HTTP Error: ${response.status}`);
  }

  // XML 응답 파싱
  const xmlText = await response.text();
  console.log('📥 우체국 응답 (XML 전체):', xmlText);

  // 에러 체크 (다양한 형식 지원)
  if (xmlText.includes('<error>') || xmlText.includes('<Error>')) {
    // 형식 1: <error_code>...</error_code>
    let errorCode = xmlText.match(/<error_code>(.*?)<\/error_code>/i)?.[1]?.trim();
    let errorMsg = xmlText.match(/<message>(.*?)<\/message>/i)?.[1]?.trim();
    
    // 형식 2: <ErrorCode>...</ErrorCode>
    if (!errorCode) {
      errorCode = xmlText.match(/<ErrorCode>(.*?)<\/ErrorCode>/i)?.[1]?.trim();
    }
    if (!errorMsg) {
      errorMsg = xmlText.match(/<ErrorMessage>(.*?)<\/ErrorMessage>/i)?.[1]?.trim() ||
                 xmlText.match(/<ErrorMsg>(.*?)<\/ErrorMsg>/i)?.[1]?.trim();
    }
    
    // 형식 3: <result>N</result> 또는 <success>N</success>
    const result = xmlText.match(/<result>(.*?)<\/result>/i)?.[1]?.trim();
    const success = xmlText.match(/<success>(.*?)<\/success>/i)?.[1]?.trim();
    
    if (result === 'N' || success === 'N') {
      errorCode = errorCode || result || success || 'UNKNOWN';
      errorMsg = errorMsg || 'API 호출 실패';
    }
    
    // 에러 정보가 있으면 throw
    if (errorCode || errorMsg) {
      throw new Error(`EPost API Error: ${errorCode || 'UNKNOWN'} - ${errorMsg || '알 수 없는 오류'}`);
    }
    
    // 에러 태그는 있지만 파싱 실패
    throw new Error(`EPost API Error: XML 파싱 실패 - ${xmlText.substring(0, 500)}`);
  }

  // 성공 여부 확인 (일부 API는 result 태그 사용)
  const result = xmlText.match(/<result>(.*?)<\/result>/i)?.[1]?.trim();
  if (result === 'N') {
    throw new Error(`EPost API Error: API 호출 실패 - ${xmlText.substring(0, 500)}`);
  }

  return xmlText;
}

/**
 * XML에서 값 추출 (간단한 파서)
 * CDATA 섹션도 처리
 */
function parseXmlValue(xml: string, tagName: string): string | null {
  // CDATA 섹션이 있는 경우: <tagName><![CDATA[value]]></tagName>
  const cdataRegex = new RegExp(`<${tagName}>\\s*<!\\[CDATA\\[(.*?)\\]\\]>\\s*</${tagName}>`, 's');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) {
    return cdataMatch[1].trim();
  }
  
  // 일반 태그: <tagName>value</tagName>
  const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * 계약 승인번호 조회
 * API ID: COMAPI-R01-02
 */
export async function getApprovalNumber(custNo: string): Promise<string> {
  const xml = await callEPostAPI('api.GetApprNo.jparcel', {
    custNo,
  });

  // XML에서 apprNo 추출
  const apprNo = parseXmlValue(xml, 'apprNo');
  if (!apprNo) {
    throw new Error('계약 승인번호를 찾을 수 없습니다');
  }

  return apprNo;
}

/**
 * 소포신청(픽업요청)
 * API ID: SHPAPI-C02-01
 */
export interface InsertOrderParams {
  // 필수
  custNo: string;           // 고객번호
  apprNo: string;           // 계약 승인번호
  payType: '1' | '2';       // 1:선불, 2:착불
  reqType: '1' | '2';       // 1:일반소포, 2:반품소포
  officeSer: string;        // 공급지코드
  orderNo: string;          // 주문번호 (고유값)
  
  // 수취인(반품인) 정보
  recNm: string;            // 수취인명
  recZip: string;           // 우편번호
  recAddr1: string;         // 주소
  recAddr2: string;         // 상세주소
  recTel?: string;          // 전화번호 (recTel, recMob 중 하나 필수)
  recMob?: string;          // 휴대전화번호
  
  // 상품 정보
  contCd: string;           // 내용품코드 (025: 의류/패션잡화)
  goodsNm: string;          // 상품명
  
  // 선택사항
  weight?: number;          // 중량(kg) default: 2
  volume?: number;          // 크기(cm) default: 60
  microYn?: 'Y' | 'N';      // 초소형 여부 default: N
  ordCompNm?: string;       // 주문처명
  ordNm?: string;           // 주문자명
  ordZip?: string;          // 주문자 우편번호
  ordAddr1?: string;        // 주문자 주소
  ordAddr2?: string;        // 주문자 상세주소
  ordTel?: string;          // 주문자 전화번호
  ordMob?: string;          // 주문자 휴대전화번호
  delivMsg?: string;        // 배송 메시지
  insuYn?: 'Y' | 'N';       // 안심소포 여부
  insuAmt?: number;         // 안심소포 보험가액
  testYn?: 'Y' | 'N';       // 테스트 여부 (개발용)
  printYn?: 'Y' | 'N';      // 운송장 자체출력 여부
  inqTelCn?: string;        // 문의처
}

export interface InsertOrderResponse {
  reqNo: string;            // 소포 주문번호
  resNo: string;            // 소포 예약번호
  regiNo: string;           // 운송장번호(등기번호) - 핵심!
  orderNo?: string;         // 주문번호 (응답에 없을 수 있음)
  regiPoNm: string;        // 접수 우체국명
  resDate: string;          // 예약 일시
  price: string;            // (예상)접수요금
  vTelNo?: string;          // 가상 전화번호
  insuFee?: string;         // 안심소포 수수료
  islandAddFee?: string;    // 도서행 부가이용료
  arrCnpoNm?: string;       // 도착 집중국명
  delivPoNm?: string;       // 배달 우체국명
  delivAreaCd?: string;     // 배달 지역코드
}

/**
 * 소포신청(픽업요청) - 메인 함수
 */
export async function insertOrder(params: InsertOrderParams): Promise<InsertOrderResponse> {
  const config = getEPostConfig();

  // 기본값 설정 및 타입 검증
  const requestParams: Record<string, any> = {
    ...params,
    custNo: config.custNo,
    weight: typeof params.weight === 'number' ? params.weight : (params.weight || 2),
    volume: typeof params.volume === 'number' ? params.volume : (params.volume || 60),
    microYn: params.microYn === 'Y' || params.microYn === 'N' ? params.microYn : 'N',
    testYn: params.testYn === 'Y' || params.testYn === 'N' ? params.testYn : 'N',
    printYn: params.printYn === 'Y' || params.printYn === 'N' ? params.printYn : 'Y',
  };
  
  // 숫자 필드 검증 및 정수 변환
  if (typeof requestParams.weight !== 'number' || requestParams.weight <= 0) {
    requestParams.weight = 2;
  } else {
    requestParams.weight = Math.floor(requestParams.weight);
  }
  
  if (typeof requestParams.volume !== 'number' || requestParams.volume <= 0) {
    requestParams.volume = 60;
  } else {
    requestParams.volume = Math.floor(requestParams.volume);
  }
  
  console.log('✅ 최종 요청 파라미터:', JSON.stringify(requestParams, null, 2));
  console.log('🔍 숫자 필드 확인:', {
    weight: requestParams.weight,
    weightType: typeof requestParams.weight,
    volume: requestParams.volume,
    volumeType: typeof requestParams.volume,
    testYn: requestParams.testYn,
  });

  // testYn이 'Y'이면 암호화 없이 호출 (테스트 모드)
  const needsEncryption = requestParams.testYn !== 'Y';
  console.log('🔐 암호화 필요 여부:', needsEncryption, '(testYn:', requestParams.testYn, ')');
  
  // regData에 포함할 파라미터 (testYn 제외)
  const regDataParams = { ...requestParams };
  delete regDataParams.testYn;
  
  const xml = await callEPostAPI('api.InsertOrder.jparcel', regDataParams, needsEncryption, requestParams.testYn);

  // XML 파싱 (CDATA 섹션 처리)
  const result: InsertOrderResponse = {
    reqNo: parseXmlValue(xml, 'reqNo') || '',
    resNo: parseXmlValue(xml, 'resNo') || '',
    regiNo: parseXmlValue(xml, 'regiNo') || '',
    orderNo: parseXmlValue(xml, 'orderNo') || undefined,
    regiPoNm: parseXmlValue(xml, 'regiPoNm') || parseXmlValue(xml, 'regipoNm') || '', // 대소문자 모두 지원
    resDate: parseXmlValue(xml, 'resDate') || '',
    price: parseXmlValue(xml, 'price') || '0',
    vTelNo: parseXmlValue(xml, 'vTelNo') || undefined,
    insuFee: parseXmlValue(xml, 'insuFee') || undefined,
    islandAddFee: parseXmlValue(xml, 'islandAddFee') || undefined,
    arrCnpoNm: parseXmlValue(xml, 'arrCnpoNm') || undefined,
    delivPoNm: parseXmlValue(xml, 'delivPoNm') || undefined,
    delivAreaCd: parseXmlValue(xml, 'delivAreaCd') || undefined,
  };
  
  // 필수 필드 검증
  if (!result.regiNo) {
    throw new Error('운송장번호(regiNo)를 받지 못했습니다.');
  }

  console.log('✅ 소포신청 성공:', result.regiNo);
  return result;
}

/**
 * 소포신청 확인
 * API ID: SHPAPI-R02-01
 */
export interface GetResInfoParams {
  custNo: string;
  reqType: '1' | '2';  // 1:일반소포, 2:반품소포
  orderNo: string;     // 주문번호
  reqYmd: string;      // 소포신청 등록일자 (YYYYMMDD)
}

export interface GetResInfoResponse {
  reqNo: string;           // 소포 주문번호
  resNo: string;           // 소포 예약번호
  regiNo: string;          // 운송장번호
  regiPoNm: string;        // 접수 우체국명
  resDate: string;         // 예약 일시
  price: string;           // 접수요금
  vTelNo?: string;         // 가상 전화번호
  treatStusCd: string;     // 소포 처리상태 코드 (00:신청준비, 01:소포신청, 02:운송장출력, 03:집하완료...)
}

/**
 * 소포신청 확인 (배송추적)
 */
export async function getResInfo(params: GetResInfoParams): Promise<GetResInfoResponse> {
  const config = getEPostConfig();

  const xml = await callEPostAPI('api.GetResInfo.jparcel', {
    ...params,
    custNo: config.custNo,
  }, true);

  // XML 파싱
  const result: GetResInfoResponse = {
    reqNo: parseXmlValue(xml, 'reqNo') || '',
    resNo: parseXmlValue(xml, 'resNo') || '',
    regiNo: parseXmlValue(xml, 'regiNo') || '',
    regiPoNm: parseXmlValue(xml, 'regiPoNm') || '',
    resDate: parseXmlValue(xml, 'resDate') || '',
    price: parseXmlValue(xml, 'price') || '0',
    vTelNo: parseXmlValue(xml, 'vTelNo') || undefined,
    treatStusCd: parseXmlValue(xml, 'treatStusCd') || '00',
  };

  return result;
}

/**
 * 소포신청 취소
 * API ID: SHPAPI-U02-01
 */
export interface CancelOrderParams {
  custNo: string;
  apprNo: string;
  reqType: '1' | '2';
  reqNo: string;      // 소포 주문번호
  resNo: string;      // 소포 예약번호
  regiNo: string;     // 운송장번호
  reqYmd?: string;    // 소포신청 등록일자
  delYn: 'Y' | 'N';   // Y:취소 및 삭제, N:취소만
}

export interface CancelOrderResponse {
  reqNo: string;
  resNo: string;
  cancelRegiNo: string;      // 취소 대상 운송장번호
  cancelDate: string;        // 취소 일시
  canceledYn: 'Y' | 'N' | 'D'; // Y:취소, N:미취소, D:삭제
  regiNo?: string;           // 취소 후 변경된 운송장번호
  notCancelReason?: string;  // 미취소 사유
}

/**
 * 소포신청 취소
 */
export async function cancelOrder(params: CancelOrderParams): Promise<CancelOrderResponse> {
  const config = getEPostConfig();

  const xml = await callEPostAPI('api.GetResCancelCmd.jparcel', {
    ...params,
    custNo: config.custNo,
  }, true);

  // XML 파싱
  const result: CancelOrderResponse = {
    reqNo: parseXmlValue(xml, 'reqNo') || '',
    resNo: parseXmlValue(xml, 'resNo') || '',
    cancelRegiNo: parseXmlValue(xml, 'cancelRegiNo') || '',
    cancelDate: parseXmlValue(xml, 'cancelDate') || '',
    canceledYn: (parseXmlValue(xml, 'canceledYn') as 'Y' | 'N' | 'D') || 'N',
    regiNo: parseXmlValue(xml, 'regiNo') || undefined,
    notCancelReason: parseXmlValue(xml, 'notCancelReason') || undefined,
  };

  return result;
}

/**
 * 접수중지 지역 우편번호 조회
 * API ID: COMAPI-R02-01
 */
export async function getStoppedZipCodes(zipCd?: string): Promise<any[]> {
  const config = getEPostConfig();
  
  const params: Record<string, string> = {};
  if (zipCd) {
    params.zipCd = zipCd;
  }

  const xml = await callEPostAPI('api.GetStoppedZipCd.jparcel', params, false);

  // 간단한 XML 파싱 (실제로는 XML 파서 라이브러리 사용 권장)
  // 여기서는 정규식으로 간단히 처리
  return [];
}

/**
 * 배송 추적 정보 조회 (우체국 추적 서비스)
 * 실제 배송 추적은 우체국 추적 서비스를 사용
 */
export function getTrackingUrl(regiNo: string): string {
  return `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${regiNo}`;
}

/**
 * Mock 소포신청 (개발/테스트용)
 * testYn=Y로 호출하거나, 보안키가 없을 때 사용
 */
export async function mockInsertOrder(params: InsertOrderParams): Promise<InsertOrderResponse> {
  console.warn('⚠️ Mock 소포신청을 사용합니다 (실제 우체국 API 호출 없음)');

  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const dateStr = yy + mm + dd;

  return {
    reqNo: `${dateStr}64036480${Math.floor(10, 99)}`,
    resNo: `${dateStr}52119${Math.floor(1000, 9999)}`,
    regiNo: `601${dateStr}${Math.floor(10000, 99999)}`, // 우체국 등기번호 형식
    orderNo: params.orderNo,
    regiPoNm: '나주우체국',
    resDate: now.toISOString().replace(/[^0-9]/g, '').substring(0, 14),
    price: '3300',
    vTelNo: `0505${Math.floor(1000000, 9999999)}`,
  };
}

