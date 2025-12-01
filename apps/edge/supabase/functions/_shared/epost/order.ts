/**
 * 소포신청 관련 API
 * 소포신청, 확인, 취소 등
 */

import { getEPostConfig } from './config.ts';
import { callEPostAPI, parseXmlValue } from './client.ts';
import type {
  InsertOrderParams,
  InsertOrderResponse,
  GetResInfoParams,
  GetResInfoResponse,
  CancelOrderParams,
  CancelOrderResponse,
  DeliveryCodeParams,
  DeliveryCodeResponse,
} from './types.ts';

/**
 * 소포신청(픽업요청) - 메인 함수
 * API ID: SHPAPI-C02-01
 */
export async function insertOrder(params: InsertOrderParams): Promise<InsertOrderResponse> {
  const config = getEPostConfig();

  // custNo 검증 및 정리 (공백 제거)
  const custNo = (params.custNo || config.custNo).trim();
  if (!custNo || custNo.length === 0) {
    throw new Error('고객번호(custNo)가 유효하지 않습니다. EPOST_CUSTOMER_ID 환경 변수를 확인하세요.');
  }

  console.log('🔍 고객번호 확인:', {
    paramCustNo: params.custNo,
    configCustNo: config.custNo,
    finalCustNo: custNo,
    custNoLength: custNo.length,
  });

  // 기본값 설정 및 타입 검증
  const requestParams: Record<string, any> = {
    ...params,
    custNo: custNo, // 검증된 고객번호 사용
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
  // ⚠️ 중요: testYn은 regData에 포함하지 않고 URL 파라미터로만 사용
  const regDataParams = { ...requestParams };
  const hadTestYn = 'testYn' in regDataParams;
  delete regDataParams.testYn;
  
  console.log('🔍 개발 체크 - regData 파라미터:', {
    hadTestYn,
    testYnRemoved: !('testYn' in regDataParams),
    regDataKeys: Object.keys(regDataParams),
    testYnValue: requestParams.testYn,
  });
  
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
 * 소포신청 확인 (배송추적)
 * API ID: SHPAPI-R02-01
 */
export async function getResInfo(params: GetResInfoParams): Promise<GetResInfoResponse> {
  const config = getEPostConfig();

  console.log('🔍 getResInfo API 호출 시작 (상세):', {
    custNo: config.custNo,
    reqType: params.reqType,
    orderNo: params.orderNo,
    reqYmd: params.reqYmd,
    endpoint: 'api.GetResInfo.jparcel',
  });

  try {
    console.log('🌐 callEPostAPI 호출 시작...');
    console.log('📊 callEPostAPI 파라미터:', {
      endpoint: 'api.GetResInfo.jparcel',
      params: {
        ...params,
        custNo: config.custNo,
      },
      useEncryption: true
    });

    const xml = await callEPostAPI('api.GetResInfo.jparcel', {
      ...params,
      custNo: config.custNo,
    }, true);
    console.log('✅ callEPostAPI 호출 성공');
    console.log('📄 반환된 XML 길이:', xml?.length || 'undefined');

    console.log('📥 getResInfo API 응답 (XML 길이):', xml.length);
    console.log('📥 getResInfo API 응답 (XML 미리보기):', xml.substring(0, 300));

    // XML 파싱
    console.log('🔄 XML 파싱 시작...');
    console.log('🔍 XML에서 treatStusCd 찾기:', xml.includes('treatStusCd'));

    const treatStusCd = parseXmlValue(xml, 'treatStusCd');
    console.log('📋 파싱된 treatStusCd:', treatStusCd);

    const result: GetResInfoResponse = {
      reqNo: parseXmlValue(xml, 'reqNo') || '',
      resNo: parseXmlValue(xml, 'resNo') || '',
      regiNo: parseXmlValue(xml, 'regiNo') || '',
      regiPoNm: parseXmlValue(xml, 'regiPoNm') || '',
      resDate: parseXmlValue(xml, 'resDate') || '',
      price: parseXmlValue(xml, 'price') || '0',
      vTelNo: parseXmlValue(xml, 'vTelNo') || undefined,
      treatStusCd: treatStusCd || '00',
    };

    console.log('📊 파싱된 모든 필드:', {
      reqNo: result.reqNo,
      resNo: result.resNo,
      regiNo: result.regiNo,
      regiPoNm: result.regiPoNm,
      resDate: result.resDate,
      price: result.price,
      vTelNo: result.vTelNo,
      treatStusCd: result.treatStusCd,
    });

    console.log('✅ getResInfo API 파싱 완료 (상세):', {
      reqNo: result.reqNo,
      resNo: result.resNo,
      regiNo: result.regiNo,
      treatStusCd: result.treatStusCd,
      regiPoNm: result.regiPoNm,
      resDate: result.resDate,
    });

    console.log('✅ getResInfo API 전체 결과:', JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('❌ getResInfo API 호출 중 에러 발생:', {
      error: error,
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      type: typeof error,
      constructor: error?.constructor?.name,
      params: {
        custNo: config.custNo,
        reqType: params.reqType,
        orderNo: params.orderNo,
        reqYmd: params.reqYmd,
      },
      config: {
        custNo: config.custNo,
        apiKey: config.apiKey ? '***' + config.apiKey.slice(-4) : 'NOT_SET',
        securityKey: config.securityKey ? '***' + config.securityKey.slice(-4) : 'NOT_SET',
      }
    });

    // 추가 디버깅 정보
    if (error?.message?.includes('fetch')) {
      console.error('❌ 네트워크 관련 에러로 추정');
    } else if (error?.message?.includes('XML')) {
      console.error('❌ XML 파싱 관련 에러로 추정');
    } else if (error?.message?.includes('timeout')) {
      console.error('❌ 타임아웃 에러로 추정');
    } else if (error?.name === 'AbortError') {
      console.error('❌ 요청이 취소되었거나 타임아웃됨');
    }

    throw error;
  }
}

/**
 * 소포신청 취소
 * API ID: SHPAPI-U02-01
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
 * 우체국명 조회
 * 공공데이터포털 - 우체국명 조회 API
 * API 키: c9199c6be5cf67e8b1764577878692
 */
export async function getPostOfficeInfo(params: PostOfficeParams): Promise<PostOfficeResponse> {
  const apiKey = Deno.env.get('EPOST_POST_OFFICE_API_KEY') || 'c9199c6be5cf67e8b1764577878692';
  
  try {
    const url = new URL('http://openapi.epost.go.kr/postal/retrievePostNmList');
    url.searchParams.append('serviceKey', apiKey);
    url.searchParams.append('postcd', params.zipcode.substring(0, 3)); // 우편번호 앞 3자리
    url.searchParams.append('numOfRows', '1');
    
    console.log('🔍 우체국명 조회 API 호출:', url.toString());
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`우체국명 조회 API HTTP Error: ${response.status}`);
    }
    
    const xmlText = await response.text();
    console.log('📥 우체국명 조회 응답:', xmlText);
    
    return {
      postOfficeName: parseXmlValue(xmlText, 'postOfficeName') || undefined,
      zipcode: parseXmlValue(xmlText, 'zipcode') || undefined,
      address: parseXmlValue(xmlText, 'address') || undefined,
    };
  } catch (error: any) {
    console.warn('⚠️ 우체국명 조회 실패:', error);
    return {};
  }
}

/**
 * 집배코드 조회
 * 공공데이터포털 - 집배구 구분코드 조회서비스
 * API 키: c9199c6be5cf67e8e1764577163889
 */
export async function getDeliveryCode(params: DeliveryCodeParams): Promise<DeliveryCodeResponse> {
  const apiKey = Deno.env.get('EPOST_DELIVERY_CODE_API_KEY') || 'c9199c6be5cf67e8e1764577163889';
  
  try {
    // 공공데이터포털 집배코드조회 API 호출
    const url = new URL('http://openapi.epost.go.kr/postal/retrieveNewAdressAreaCd');
    url.searchParams.append('serviceKey', apiKey);
    url.searchParams.append('srchwrd', params.zipcode); // 우편번호로 검색
    url.searchParams.append('numOfRows', '1');
    url.searchParams.append('pageNo', '1');
    
    console.log('🔍 집배코드조회 API 호출:', url.toString());
    
    const response = await fetch(url.toString(), {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`집배코드조회 API HTTP Error: ${response.status}`);
    }
    
    const xmlText = await response.text();
    console.log('📥 집배코드조회 응답:', xmlText);
    
    // XML 파싱
    const result: DeliveryCodeResponse = {
      arrCnpoNm: parseXmlValue(xmlText, 'sopoArrcnpoNm') || undefined,
      delivPoNm: parseXmlValue(xmlText, 'delivPoNm') || undefined,
      delivAreaCd: parseXmlValue(xmlText, 'dlvyareacd') || undefined,
      // 추가 분류 코드 (필드명은 실제 응답에 따라 조정 필요)
      sortCode1: parseXmlValue(xmlText, 'sortCode1') || undefined,
      sortCode2: parseXmlValue(xmlText, 'sortCode2') || undefined,
      sortCode3: parseXmlValue(xmlText, 'sortCode3') || undefined,
      sortCode4: parseXmlValue(xmlText, 'sortCode4') || undefined,
    };
    
    console.log('✅ 집배코드 조회 성공:', result);
    return result;
  } catch (error: any) {
    console.error('❌ 집배코드 조회 실패:', error);
    // 실패해도 빈 객체 반환 (필수 아님)
    return {};
  }
}

/**
 * 배송 추적 정보 조회 (우체국 추적 서비스)
 * 실제 배송 추적은 우체국 추적 서비스를 사용
 */
export function getTrackingUrl(regiNo: string): string {
  return `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${regiNo}`;
}

