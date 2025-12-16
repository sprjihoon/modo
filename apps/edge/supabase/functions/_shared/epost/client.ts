/**
 * 우체국 API 클라이언트
 * 공통 API 호출 로직
 */

import { getEPostConfig, getEPostBaseUrl } from './config.ts';
import { seed128Encrypt, buildEpostParams } from '../seed128.ts';

/**
 * XML에서 값 추출 (간단한 파서)
 * CDATA 섹션도 처리
 */
export function parseXmlValue(xml: string, tagName: string): string | null {
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
 * 우체국 API 호출 (공통)
 * @param endpoint API 메시지명 (예: api.InsertOrder.jparcel)
 * @param params 암호화할 파라미터 객체
 * @param needsEncryption 암호화 여부
 * @param testYn 테스트 여부 ('Y' 또는 undefined)
 */
export async function callEPostAPI(
  endpoint: string,
  params: Record<string, any>,
  needsEncryption = true,
  testYn?: string
): Promise<string> {
  const config = getEPostConfig();
  const baseUrl = getEPostBaseUrl();
  
  // custNo 파라미터 검증
  const custNo = params.custNo?.trim();
  if (!custNo || custNo.length === 0) {
    throw new Error('고객번호(custNo)가 파라미터에 없거나 비어있습니다.');
  }

  let url = `${baseUrl}/${endpoint}?key=${config.apiKey}`;
  
  // testYn이 'Y'이면 URL 파라미터로 추가
  // ⚠️ testYn='N'이거나 undefined일 때는 URL 파라미터로 추가하지 않음
  // 우체국 API는 testYn 파라미터가 없으면 기본 동작으로 처리
  if (testYn === 'Y') {
    url += '&testYn=Y';
    console.log('🔍 testYn=Y로 URL 파라미터 추가됨 (테스트 모드)');
  } else {
    console.log('🔍 testYn 파라미터를 URL에 추가하지 않음 (기본 동작)');
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
  console.log('📡 URL (전체):', url);
  console.log('📡 URL (미리보기):', url.substring(0, 150) + '...');
  console.log('🔍 개발 체크 - URL 파라미터:', {
    hasTestYn: url.includes('testYn='),
    testYnValue: url.includes('testYn=Y') ? 'Y' : url.includes('testYn=N') ? 'N' : '없음',
    hasRegData: url.includes('regData='),
  });

  // HTTP 호출 (GET/POST 둘 다 지원)
  console.log('🚀 fetch 호출 시작...');
  console.log('📡 최종 URL:', url);

  // 타임아웃 설정 (30초)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error('⏰ fetch 타임아웃 발생 (30초)');
    controller.abort();
  }, 30000);

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Connection': 'keep-alive',
        'Host': 'ship.epost.go.kr',
        'User-Agent': 'Apache-HttpClient/4.5.1 (Java/1.8.0_91)',
        'Accept': 'application/xml, text/xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId); // 타임아웃 취소
    console.log('✅ fetch 호출 성공');

  } catch (fetchError: any) {
    clearTimeout(timeoutId); // 타임아웃 취소
    console.error('❌ fetch 호출 중 에러 발생:', {
      error: fetchError,
      message: fetchError?.message,
      name: fetchError?.name,
      type: typeof fetchError,
      isAbortError: fetchError?.name === 'AbortError',
    });

    if (fetchError?.name === 'AbortError') {
      throw new Error('EPost API 타임아웃: 30초 내에 응답이 없습니다.');
    } else {
      throw new Error(`EPost API 네트워크 에러: ${fetchError?.message || '알 수 없는 네트워크 오류'}`);
    }
  }

  console.log('📥 HTTP 응답 상태:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries())
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ HTTP 에러 응답:', errorText);
    throw new Error(`EPost API HTTP Error: ${response.status} - ${errorText}`);
  }

  // XML 응답 파싱
  console.log('📄 response.text() 호출 시작...');
  const xmlText = await response.text();
  console.log('📥 우체국 응답 길이:', xmlText.length);
  console.log('📥 우체국 응답 (XML 전체):', xmlText);

  // 에러 체크 (다양한 형식 지원)
  if (xmlText.includes('<error>') || xmlText.includes('<Error>') || xmlText.includes('ERR-211')) {
    // CDATA를 포함한 강력한 파싱
    let errorCode: string | null = null;
    let errorMsg: string | null = null;
    
    // 방법 1: CDATA 포함 파싱 (멀티라인 지원)
    const errorCodeMatch = xmlText.match(/<error_code>[\s\S]*?<!\[CDATA\[(.*?)\]\]>[\s\S]*?<\/error_code>/i) ||
                            xmlText.match(/<error_code>[\s\S]*?([A-Z0-9\-]+)[\s\S]*?<\/error_code>/i);
    if (errorCodeMatch) {
      errorCode = errorCodeMatch[1]?.trim() || null;
    }
    
    const errorMsgMatch = xmlText.match(/<message>[\s\S]*?<!\[CDATA\[(.*?)\]\]>[\s\S]*?<\/message>/is) ||
                           xmlText.match(/<message>[\s\S]*?([^<]+)[\s\S]*?<\/message>/is);
    if (errorMsgMatch) {
      errorMsg = errorMsgMatch[1]?.trim() || null;
    }
    
    // 방법 2: 일반 태그 파싱 (CDATA 없을 경우)
    if (!errorCode) {
      const simpleCodeMatch = xmlText.match(/<error_code>([^<]+)<\/error_code>/i);
      if (simpleCodeMatch) {
        errorCode = simpleCodeMatch[1].trim();
      }
    }
    
    if (!errorMsg) {
      const simpleMsgMatch = xmlText.match(/<message>([^<]+)<\/message>/i);
      if (simpleMsgMatch) {
        errorMsg = simpleMsgMatch[1].trim();
      }
    }
    
    // 방법 3: 대문자 태그 시도
    if (!errorCode) {
      const upperCodeMatch = xmlText.match(/<ErrorCode>[\s\S]*?<!\[CDATA\[(.*?)\]\]>[\s\S]*?<\/ErrorCode>/i) ||
                              xmlText.match(/<ErrorCode>([^<]+)<\/ErrorCode>/i);
      if (upperCodeMatch) {
        errorCode = upperCodeMatch[1]?.trim() || null;
      }
    }
    
    if (!errorMsg) {
      const upperMsgMatch = xmlText.match(/<ErrorMessage>[\s\S]*?<!\[CDATA\[(.*?)\]\]>[\s\S]*?<\/ErrorMessage>/is) ||
                            xmlText.match(/<ErrorMessage>([^<]+)<\/ErrorMessage>/i) ||
                            xmlText.match(/<ErrorMsg>([^<]+)<\/ErrorMsg>/i);
      if (upperMsgMatch) {
        errorMsg = upperMsgMatch[1]?.trim() || null;
      }
    }
    
    // 방법 4: result/success 태그 확인
    const result = xmlText.match(/<result>(.*?)<\/result>/i)?.[1]?.trim();
    const success = xmlText.match(/<success>(.*?)<\/success>/i)?.[1]?.trim();
    
    if (result === 'N' || success === 'N') {
      errorCode = errorCode || result || success || 'UNKNOWN';
      errorMsg = errorMsg || 'API 호출 실패';
    }
    
    // ERR-211 특별 처리: 고객번호 오류
    if (errorCode === 'ERR-211' || xmlText.includes('ERR-211') || errorMsg?.includes('고객번호') || errorMsg?.includes('custNo')) {
      const finalErrorCode = errorCode || 'ERR-211';
      const finalErrorMsg = errorMsg || '데이터오류-고객번호(custNo) 값이 유효하지 않습니다.';
      const detailedMsg = `고객번호(custNo)가 유효하지 않습니다. EPOST_CUSTOMER_ID 환경 변수를 확인하세요. (에러 코드: ${finalErrorCode}, 메시지: ${finalErrorMsg})`;
      console.error('❌ ERR-211 고객번호 오류:', {
        errorCode: finalErrorCode,
        errorMsg: finalErrorMsg,
        custNo: params.custNo || config.custNo,
        custNoLength: (params.custNo || config.custNo)?.length,
        envCustNo: config.custNo,
        xmlPreview: xmlText.substring(0, 200),
      });
      throw new Error(`EPost API Error: ${finalErrorCode} - ${detailedMsg}`);
    }
    
    // 일반 에러 처리
    if (errorCode || errorMsg) {
      console.error('❌ 우체국 API 에러:', {
        errorCode: errorCode || 'UNKNOWN',
        errorMsg: errorMsg || '알 수 없는 오류',
        xmlPreview: xmlText.substring(0, 300),
      });
      throw new Error(`EPost API Error: ${errorCode || 'UNKNOWN'} - ${errorMsg || '알 수 없는 오류'}`);
    }
    
    // 에러 태그는 있지만 파싱 실패 - 원본 XML 포함
    console.error('❌ XML 파싱 실패:', {
      xmlPreview: xmlText.substring(0, 500),
      hasErrorTag: xmlText.includes('<error>'),
      hasErrorCode: xmlText.includes('error_code'),
    });
    throw new Error(`EPost API Error: XML 파싱 실패 - ${xmlText.substring(0, 500)}`);
  }

  // 성공 여부 확인 (일부 API는 result 태그 사용)
  const result = xmlText.match(/<result>(.*?)<\/result>/i)?.[1]?.trim();
  if (result === 'N') {
    throw new Error(`EPost API Error: API 호출 실패 - ${xmlText.substring(0, 500)}`);
  }

  return xmlText;
}

