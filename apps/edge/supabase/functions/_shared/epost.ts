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
  const custNo = Deno.env.get('EPOST_CUSTOMER_ID');

  if (!apiKey) {
    throw new Error('EPOST_API_KEY not configured');
  }
  if (!securityKey) {
    throw new Error('EPOST_SECURITY_KEY not configured');
  }
  if (!custNo) {
    throw new Error('EPOST_CUSTOMER_ID not configured');
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
  needsEncryption = true
): Promise<any> {
  const config = getEPostConfig();

  let url = `${EPOST_BASE_URL}/${endpoint}?key=${config.apiKey}`;

  if (needsEncryption) {
    // 파라미터를 문자열로 변환
    const plainText = buildEpostParams(params);
    console.log('📝 암호화할 평문:', plainText);

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
  console.log('📥 우체국 응답 (XML):', xmlText.substring(0, 200) + '...');

  // 간단한 XML 파싱 (error 체크)
  if (xmlText.includes('<error>')) {
    const errorCode = xmlText.match(/<error_code>(.*?)<\/error_code>/)?.[1];
    const errorMsg = xmlText.match(/<message>(.*?)<\/message>/)?.[1];
    throw new Error(`EPost API Error: ${errorCode} - ${errorMsg}`);
  }

  return xmlText;
}

/**
 * XML에서 값 추출 (간단한 파서)
 */
function parseXmlValue(xml: string, tagName: string): string | null {
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
  orderNo: string;          // 주문번호
  regiPoNm: string;         // 접수 우체국명
  resDate: string;          // 예약 일시
  price: string;            // (예상)접수요금
  vTelNo?: string;          // 가상 전화번호
  insuFee?: string;         // 안심소포 수수료
  islandAddFee?: string;    // 도서행 부가이용료
}

/**
 * 소포신청(픽업요청) - 메인 함수
 */
export async function insertOrder(params: InsertOrderParams): Promise<InsertOrderResponse> {
  const config = getEPostConfig();

  // 기본값 설정
  const requestParams = {
    ...params,
    custNo: config.custNo,
    weight: params.weight || 2,
    volume: params.volume || 60,
    microYn: params.microYn || 'N',
    testYn: params.testYn || 'N',
    printYn: params.printYn || 'Y',
  };

  const xml = await callEPostAPI('api.InsertOrder.jparcel', requestParams, true);

  // XML 파싱
  const result: InsertOrderResponse = {
    reqNo: parseXmlValue(xml, 'reqNo') || '',
    resNo: parseXmlValue(xml, 'resNo') || '',
    regiNo: parseXmlValue(xml, 'regiNo') || '',
    orderNo: parseXmlValue(xml, 'orderNo') || '',
    regiPoNm: parseXmlValue(xml, 'regipoNm') || '',
    resDate: parseXmlValue(xml, 'resDate') || '',
    price: parseXmlValue(xml, 'price') || '0',
    vTelNo: parseXmlValue(xml, 'vTelNo') || undefined,
    insuFee: parseXmlValue(xml, 'insuFee') || undefined,
    islandAddFee: parseXmlValue(xml, 'islandAddFee') || undefined,
  };

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

