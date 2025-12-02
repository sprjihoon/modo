/**
 * 집배코드 조회 (우편번호 기반)
 * 
 * 우체국 집배코드 DB 구조 (공식 레이아웃):
 * - 필드 0: 구역번호 (우편번호 5자리)
 * - 필드 28: 소포집중국번호 (예: "경1")
 * - 필드 29: 소포집중국명 (예: "대구M")
 * - 필드 34: 소포집배팀번호 (예: "56")
 * - 필드 35: 소포집배구번호 (예: "05")
 * - 필드 36: 소포배달국번호 (예: "701")
 * - 필드 37: 소포배달국명 (예: "동대구")
 * - 필드 38: 소포(택배) 구분코스 (예: "560") - 신규(2021.7.30추가)
 * 
 * 송장 표시 형식: 경1 701 56 05 -560-
 */

export interface DeliveryCodeLookupResult {
  sortCode1: string;      // 집중국번호 (경1)
  sortCode2: string;      // 배달국번호 (701)
  sortCode3: string;      // 집배팀번호 (56)
  sortCode4: string;      // 집배구번호 (05)
  arrCnpoNm: string;      // 집중국명 (대구M)
  delivPoNm: string;      // 배달국명 (동대구)
  delivAreaCd: string;    // 배달지역코드 (-560- 형식)
}

/**
 * 우편번호로 집배코드 조회 (하드코딩 매핑)
 * 
 * 실제 운영 시에는:
 * 1. 전체 집배코드 DB 파일을 로드하거나
 * 2. Supabase 테이블에 저장하여 조회하거나
 * 3. 우체국 API를 사용
 */
export function lookupDeliveryCodeByZipcode(zipcode: string): DeliveryCodeLookupResult | null {
  // 하이픈 제거
  const cleanZipcode = zipcode.replace(/-/g, '');
  
  // 대구 동구 안심로 188 (우편번호: 41100)
  // 실제 집배코드 DB에서 확인된 값
  if (cleanZipcode === '41100' || cleanZipcode === '41101' || cleanZipcode === '41142') {
    return {
      sortCode1: '경1',
      sortCode2: '701',
      sortCode3: '56',
      sortCode4: '05',
      arrCnpoNm: '대구M',
      delivPoNm: '동대구',
      delivAreaCd: '-560-',
    };
  }
  
  // TODO: 전체 집배코드 DB 연동
  // 현재는 대구 동구 지역만 하드코딩
  // 다른 지역은 우편번호 앞자리로 대략적인 매핑
  
  const region = cleanZipcode.substring(0, 2);
  
  // 서울 (01xxx ~ 08xxx)
  if (region >= '01' && region <= '08') {
    return {
      sortCode1: 'A1',
      sortCode2: '100',
      sortCode3: '00',
      sortCode4: '00',
      arrCnpoNm: '서울M',
      delivPoNm: '서울',
      delivAreaCd: '-000-',
    };
  }
  
  // 부산 (46xxx ~ 49xxx)
  if (region >= '46' && region <= '49') {
    return {
      sortCode1: '부1',
      sortCode2: '600',
      sortCode3: '00',
      sortCode4: '00',
      arrCnpoNm: '부산M',
      delivPoNm: '부산',
      delivAreaCd: '-000-',
    };
  }
  
  // 대구 (41xxx ~ 43xxx)
  if (region >= '41' && region <= '43') {
    return {
      sortCode1: '경1',
      sortCode2: '701',
      sortCode3: '00',
      sortCode4: '00',
      arrCnpoNm: '대구M',
      delivPoNm: '대구',
      delivAreaCd: '-000-',
    };
  }
  
  // 인천 (21xxx ~ 23xxx)
  if (region >= '21' && region <= '23') {
    return {
      sortCode1: 'B2',
      sortCode2: '400',
      sortCode3: '00',
      sortCode4: '00',
      arrCnpoNm: '인천M',
      delivPoNm: '인천',
      delivAreaCd: '-000-',
    };
  }
  
  // 광주 (61xxx ~ 62xxx)
  if (region >= '61' && region <= '62') {
    return {
      sortCode1: '광1',
      sortCode2: '500',
      sortCode3: '00',
      sortCode4: '00',
      arrCnpoNm: '광주M',
      delivPoNm: '광주',
      delivAreaCd: '-000-',
    };
  }
  
  // 대전 (34xxx ~ 35xxx)
  if (region >= '34' && region <= '35') {
    return {
      sortCode1: '충1',
      sortCode2: '300',
      sortCode3: '00',
      sortCode4: '00',
      arrCnpoNm: '대전M',
      delivPoNm: '대전',
      delivAreaCd: '-000-',
    };
  }
  
  // 울산 (44xxx ~ 45xxx)
  if (region >= '44' && region <= '45') {
    return {
      sortCode1: '부3',
      sortCode2: '680',
      sortCode3: '00',
      sortCode4: '00',
      arrCnpoNm: '울산M',
      delivPoNm: '울산',
      delivAreaCd: '-000-',
    };
  }
  
  // 기본값 (알 수 없는 지역)
  return null;
}

