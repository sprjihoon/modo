/**
 * 클라이언트 측 집배코드 조회
 * (서버 측과 동일한 로직)
 */

export interface DeliveryCodeResult {
  sortCode1: string;
  sortCode2: string;
  sortCode3: string;
  sortCode4: string;
  arrCnpoNm: string;
  delivPoNm: string;
  delivAreaCd: string;
}

// 정확한 우편번호 매핑
const EXACT_MAP: Record<string, DeliveryCodeResult> = {
  '41100': { sortCode1: '경1', sortCode2: '701', sortCode3: '56', sortCode4: '05', arrCnpoNm: '대구M', delivPoNm: '동대구', delivAreaCd: '-560-' },
  '41101': { sortCode1: '경1', sortCode2: '701', sortCode3: '56', sortCode4: '05', arrCnpoNm: '대구M', delivPoNm: '동대구', delivAreaCd: '-560-' },
  '41142': { sortCode1: '경1', sortCode2: '701', sortCode3: '56', sortCode4: '05', arrCnpoNm: '대구M', delivPoNm: '동대구', delivAreaCd: '-560-' },
};

// 지역별 기본 매핑 (우편번호 앞 2자리)
const REGION_MAP: Record<string, DeliveryCodeResult> = {
  '01': { sortCode1: 'A1', sortCode2: '100', sortCode3: '00', sortCode4: '00', arrCnpoNm: '서울M', delivPoNm: '서울', delivAreaCd: '-000-' },
  '02': { sortCode1: 'A1', sortCode2: '100', sortCode3: '00', sortCode4: '00', arrCnpoNm: '서울M', delivPoNm: '서울', delivAreaCd: '-000-' },
  '41': { sortCode1: '경1', sortCode2: '701', sortCode3: '00', sortCode4: '00', arrCnpoNm: '대구M', delivPoNm: '대구', delivAreaCd: '-000-' },
  '42': { sortCode1: '경1', sortCode2: '701', sortCode3: '00', sortCode4: '00', arrCnpoNm: '대구M', delivPoNm: '대구', delivAreaCd: '-000-' },
  '43': { sortCode1: '경1', sortCode2: '701', sortCode3: '00', sortCode4: '00', arrCnpoNm: '대구M', delivPoNm: '대구', delivAreaCd: '-000-' },
  '46': { sortCode1: '부1', sortCode2: '600', sortCode3: '00', sortCode4: '00', arrCnpoNm: '부산M', delivPoNm: '부산', delivAreaCd: '-000-' },
  '61': { sortCode1: '광1', sortCode2: '500', sortCode3: '00', sortCode4: '00', arrCnpoNm: '광주M', delivPoNm: '광주', delivAreaCd: '-000-' },
  '34': { sortCode1: '충1', sortCode2: '300', sortCode3: '00', sortCode4: '00', arrCnpoNm: '대전M', delivPoNm: '대전', delivAreaCd: '-000-' },
};

export function lookupDeliveryCode(zipcode: string): DeliveryCodeResult | null {
  if (!zipcode) return null;
  
  const clean = zipcode.replace(/-/g, '');
  
  // 정확한 매핑 확인
  if (EXACT_MAP[clean]) {
    return EXACT_MAP[clean];
  }
  
  // 지역 매핑
  const region = clean.substring(0, 2);
  if (REGION_MAP[region]) {
    return REGION_MAP[region];
  }
  
  // 기본값
  return REGION_MAP['01'];
}

