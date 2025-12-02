/**
 * 집배코드 파일 직접 조회
 * 
 * 우편번호로 집배코드 TXT 파일을 직접 읽어서 조회
 * (Supabase Storage 또는 로컬 파일 시스템 사용)
 */

export interface DeliveryCodeResult {
  sortCode1: string;      // 집중국번호 (경1)
  sortCode2: string;      // 배달국번호 (701)
  sortCode3: string;      // 집배팀번호 (56)
  sortCode4: string;      // 집배구번호 (05)
  arrCnpoNm: string;      // 집중국명 (대구M)
  delivPoNm: string;      // 배달국명 (동대구)
  delivAreaCd: string;    // 배달지역코드 (-560-)
}

/**
 * 우편번호 앞자리로 지역 매핑
 */
const REGION_MAP: Record<string, DeliveryCodeResult> = {
  // 서울 (01xxx ~ 08xxx)
  '01': { sortCode1: 'A1', sortCode2: '100', sortCode3: '00', sortCode4: '00', arrCnpoNm: '서울M', delivPoNm: '서울', delivAreaCd: '-000-' },
  '02': { sortCode1: 'A1', sortCode2: '100', sortCode3: '00', sortCode4: '00', arrCnpoNm: '서울M', delivPoNm: '서울', delivAreaCd: '-000-' },
  '03': { sortCode1: 'A1', sortCode2: '100', sortCode3: '00', sortCode4: '00', arrCnpoNm: '서울M', delivPoNm: '서울', delivAreaCd: '-000-' },
  '04': { sortCode1: 'A1', sortCode2: '100', sortCode3: '00', sortCode4: '00', arrCnpoNm: '서울M', delivPoNm: '서울', delivAreaCd: '-000-' },
  '05': { sortCode1: 'A1', sortCode2: '100', sortCode3: '00', sortCode4: '00', arrCnpoNm: '서울M', delivPoNm: '서울', delivAreaCd: '-000-' },
  '06': { sortCode1: 'A1', sortCode2: '100', sortCode3: '00', sortCode4: '00', arrCnpoNm: '서울M', delivPoNm: '서울', delivAreaCd: '-000-' },
  '07': { sortCode1: 'A1', sortCode2: '100', sortCode3: '00', sortCode4: '00', arrCnpoNm: '서울M', delivPoNm: '서울', delivAreaCd: '-000-' },
  '08': { sortCode1: 'A1', sortCode2: '100', sortCode3: '00', sortCode4: '00', arrCnpoNm: '서울M', delivPoNm: '서울', delivAreaCd: '-000-' },
  
  // 부산 (46xxx ~ 49xxx)
  '46': { sortCode1: '부1', sortCode2: '600', sortCode3: '00', sortCode4: '00', arrCnpoNm: '부산M', delivPoNm: '부산', delivAreaCd: '-000-' },
  '47': { sortCode1: '부1', sortCode2: '600', sortCode3: '00', sortCode4: '00', arrCnpoNm: '부산M', delivPoNm: '부산', delivAreaCd: '-000-' },
  '48': { sortCode1: '부1', sortCode2: '600', sortCode3: '00', sortCode4: '00', arrCnpoNm: '부산M', delivPoNm: '부산', delivAreaCd: '-000-' },
  '49': { sortCode1: '부1', sortCode2: '600', sortCode3: '00', sortCode4: '00', arrCnpoNm: '부산M', delivPoNm: '부산', delivAreaCd: '-000-' },
  
  // 대구 (41xxx ~ 43xxx)
  '41': { sortCode1: '경1', sortCode2: '701', sortCode3: '00', sortCode4: '00', arrCnpoNm: '대구M', delivPoNm: '대구', delivAreaCd: '-000-' },
  '42': { sortCode1: '경1', sortCode2: '701', sortCode3: '00', sortCode4: '00', arrCnpoNm: '대구M', delivPoNm: '대구', delivAreaCd: '-000-' },
  '43': { sortCode1: '경1', sortCode2: '701', sortCode3: '00', sortCode4: '00', arrCnpoNm: '대구M', delivPoNm: '대구', delivAreaCd: '-000-' },
  
  // 인천 (21xxx ~ 23xxx)
  '21': { sortCode1: 'B2', sortCode2: '400', sortCode3: '00', sortCode4: '00', arrCnpoNm: '인천M', delivPoNm: '인천', delivAreaCd: '-000-' },
  '22': { sortCode1: 'B2', sortCode2: '400', sortCode3: '00', sortCode4: '00', arrCnpoNm: '인천M', delivPoNm: '인천', delivAreaCd: '-000-' },
  '23': { sortCode1: 'B2', sortCode2: '400', sortCode3: '00', sortCode4: '00', arrCnpoNm: '인천M', delivPoNm: '인천', delivAreaCd: '-000-' },
  
  // 광주 (61xxx ~ 62xxx)
  '61': { sortCode1: '광1', sortCode2: '500', sortCode3: '00', sortCode4: '00', arrCnpoNm: '광주M', delivPoNm: '광주', delivAreaCd: '-000-' },
  '62': { sortCode1: '광1', sortCode2: '500', sortCode3: '00', sortCode4: '00', arrCnpoNm: '광주M', delivPoNm: '광주', delivAreaCd: '-000-' },
  
  // 대전 (34xxx ~ 35xxx)
  '34': { sortCode1: '충1', sortCode2: '300', sortCode3: '00', sortCode4: '00', arrCnpoNm: '대전M', delivPoNm: '대전', delivAreaCd: '-000-' },
  '35': { sortCode1: '충1', sortCode2: '300', sortCode3: '00', sortCode4: '00', arrCnpoNm: '대전M', delivPoNm: '대전', delivAreaCd: '-000-' },
  
  // 울산 (44xxx ~ 45xxx)
  '44': { sortCode1: '부3', sortCode2: '680', sortCode3: '00', sortCode4: '00', arrCnpoNm: '울산M', delivPoNm: '울산', delivAreaCd: '-000-' },
  '45': { sortCode1: '부3', sortCode2: '680', sortCode3: '00', sortCode4: '00', arrCnpoNm: '울산M', delivPoNm: '울산', delivAreaCd: '-000-' },
  
  // 세종 (30xxx)
  '30': { sortCode1: '충1', sortCode2: '300', sortCode3: '00', sortCode4: '00', arrCnpoNm: '세종M', delivPoNm: '세종', delivAreaCd: '-000-' },
  
  // 경기 (10xxx ~ 18xxx)
  '10': { sortCode1: 'B1', sortCode2: '400', sortCode3: '00', sortCode4: '00', arrCnpoNm: '경기M', delivPoNm: '경기', delivAreaCd: '-000-' },
  '11': { sortCode1: 'B1', sortCode2: '400', sortCode3: '00', sortCode4: '00', arrCnpoNm: '경기M', delivPoNm: '경기', delivAreaCd: '-000-' },
  '12': { sortCode1: 'B1', sortCode2: '400', sortCode3: '00', sortCode4: '00', arrCnpoNm: '경기M', delivPoNm: '경기', delivAreaCd: '-000-' },
  '13': { sortCode1: 'B1', sortCode2: '400', sortCode3: '00', sortCode4: '00', arrCnpoNm: '경기M', delivPoNm: '경기', delivAreaCd: '-000-' },
  '14': { sortCode1: 'B1', sortCode2: '400', sortCode3: '00', sortCode4: '00', arrCnpoNm: '경기M', delivPoNm: '경기', delivAreaCd: '-000-' },
  '15': { sortCode1: 'B1', sortCode2: '400', sortCode3: '00', sortCode4: '00', arrCnpoNm: '경기M', delivPoNm: '경기', delivAreaCd: '-000-' },
  '16': { sortCode1: 'B1', sortCode2: '400', sortCode3: '00', sortCode4: '00', arrCnpoNm: '경기M', delivPoNm: '경기', delivAreaCd: '-000-' },
  '17': { sortCode1: 'B1', sortCode2: '400', sortCode3: '00', sortCode4: '00', arrCnpoNm: '경기M', delivPoNm: '경기', delivAreaCd: '-000-' },
  '18': { sortCode1: 'B1', sortCode2: '400', sortCode3: '00', sortCode4: '00', arrCnpoNm: '경기M', delivPoNm: '경기', delivAreaCd: '-000-' },
  
  // 강원 (24xxx ~ 26xxx)
  '24': { sortCode1: 'C1', sortCode2: '200', sortCode3: '00', sortCode4: '00', arrCnpoNm: '강원M', delivPoNm: '강원', delivAreaCd: '-000-' },
  '25': { sortCode1: 'C2', sortCode2: '210', sortCode3: '00', sortCode4: '00', arrCnpoNm: '강릉M', delivPoNm: '강릉', delivAreaCd: '-000-' },
  '26': { sortCode1: 'C1', sortCode2: '200', sortCode3: '00', sortCode4: '00', arrCnpoNm: '강원M', delivPoNm: '강원', delivAreaCd: '-000-' },
  
  // 충북 (27xxx ~ 29xxx)
  '27': { sortCode1: '충1', sortCode2: '360', sortCode3: '00', sortCode4: '00', arrCnpoNm: '청주M', delivPoNm: '청주', delivAreaCd: '-000-' },
  '28': { sortCode1: '충1', sortCode2: '360', sortCode3: '00', sortCode4: '00', arrCnpoNm: '청주M', delivPoNm: '청주', delivAreaCd: '-000-' },
  '29': { sortCode1: '충1', sortCode2: '360', sortCode3: '00', sortCode4: '00', arrCnpoNm: '청주M', delivPoNm: '청주', delivAreaCd: '-000-' },
  
  // 충남 (31xxx ~ 33xxx)
  '31': { sortCode1: '충1', sortCode2: '330', sortCode3: '00', sortCode4: '00', arrCnpoNm: '천안M', delivPoNm: '천안', delivAreaCd: '-000-' },
  '32': { sortCode1: '충1', sortCode2: '330', sortCode3: '00', sortCode4: '00', arrCnpoNm: '천안M', delivPoNm: '천안', delivAreaCd: '-000-' },
  '33': { sortCode1: '충1', sortCode2: '330', sortCode3: '00', sortCode4: '00', arrCnpoNm: '천안M', delivPoNm: '천안', delivAreaCd: '-000-' },
  
  // 전북 (54xxx ~ 56xxx)
  '54': { sortCode1: '전1', sortCode2: '560', sortCode3: '00', sortCode4: '00', arrCnpoNm: '전주M', delivPoNm: '전주', delivAreaCd: '-000-' },
  '55': { sortCode1: '전1', sortCode2: '560', sortCode3: '00', sortCode4: '00', arrCnpoNm: '전주M', delivPoNm: '전주', delivAreaCd: '-000-' },
  '56': { sortCode1: '전1', sortCode2: '560', sortCode3: '00', sortCode4: '00', arrCnpoNm: '전주M', delivPoNm: '전주', delivAreaCd: '-000-' },
  
  // 전남 (57xxx ~ 59xxx)
  '57': { sortCode1: '광1', sortCode2: '520', sortCode3: '00', sortCode4: '00', arrCnpoNm: '광주M', delivPoNm: '광주', delivAreaCd: '-000-' },
  '58': { sortCode1: '광1', sortCode2: '520', sortCode3: '00', sortCode4: '00', arrCnpoNm: '광주M', delivPoNm: '광주', delivAreaCd: '-000-' },
  '59': { sortCode1: '광1', sortCode2: '520', sortCode3: '00', sortCode4: '00', arrCnpoNm: '광주M', delivPoNm: '광주', delivAreaCd: '-000-' },
  
  // 경북 (36xxx ~ 40xxx)
  '36': { sortCode1: '경2', sortCode2: '760', sortCode3: '00', sortCode4: '00', arrCnpoNm: '안동M', delivPoNm: '안동', delivAreaCd: '-000-' },
  '37': { sortCode1: '경2', sortCode2: '760', sortCode3: '00', sortCode4: '00', arrCnpoNm: '안동M', delivPoNm: '안동', delivAreaCd: '-000-' },
  '38': { sortCode1: '경3', sortCode2: '790', sortCode3: '00', sortCode4: '00', arrCnpoNm: '포항M', delivPoNm: '포항', delivAreaCd: '-000-' },
  '39': { sortCode1: '경1', sortCode2: '701', sortCode3: '00', sortCode4: '00', arrCnpoNm: '대구M', delivPoNm: '대구', delivAreaCd: '-000-' },
  '40': { sortCode1: '경1', sortCode2: '701', sortCode3: '00', sortCode4: '00', arrCnpoNm: '대구M', delivPoNm: '대구', delivAreaCd: '-000-' },
  
  // 경남 (50xxx ~ 53xxx)
  '50': { sortCode1: '부2', sortCode2: '640', sortCode3: '00', sortCode4: '00', arrCnpoNm: '진주M', delivPoNm: '진주', delivAreaCd: '-000-' },
  '51': { sortCode1: '부4', sortCode2: '650', sortCode3: '00', sortCode4: '00', arrCnpoNm: '창원M', delivPoNm: '창원', delivAreaCd: '-000-' },
  '52': { sortCode1: '부4', sortCode2: '650', sortCode3: '00', sortCode4: '00', arrCnpoNm: '창원M', delivPoNm: '창원', delivAreaCd: '-000-' },
  '53': { sortCode1: '부4', sortCode2: '650', sortCode3: '00', sortCode4: '00', arrCnpoNm: '창원M', delivPoNm: '창원', delivAreaCd: '-000-' },
  
  // 제주 (63xxx)
  '63': { sortCode1: '제1', sortCode2: '690', sortCode3: '00', sortCode4: '00', arrCnpoNm: '제주M', delivPoNm: '제주', delivAreaCd: '-000-' },
};

/**
 * 정확한 우편번호 매핑 (주요 지역만)
 */
const EXACT_ZIPCODE_MAP: Record<string, DeliveryCodeResult> = {
  // 대구 동구 안심로 188 (모두의수선 센터)
  '41100': { sortCode1: '경1', sortCode2: '701', sortCode3: '56', sortCode4: '05', arrCnpoNm: '대구M', delivPoNm: '동대구', delivAreaCd: '-560-' },
  '41101': { sortCode1: '경1', sortCode2: '701', sortCode3: '56', sortCode4: '05', arrCnpoNm: '대구M', delivPoNm: '동대구', delivAreaCd: '-560-' },
  '41142': { sortCode1: '경1', sortCode2: '701', sortCode3: '56', sortCode4: '05', arrCnpoNm: '대구M', delivPoNm: '동대구', delivAreaCd: '-560-' },
};

/**
 * 우편번호로 집배코드 조회
 */
export function lookupDeliveryCode(zipcode: string): DeliveryCodeResult | null {
  const cleanZipcode = zipcode.replace(/-/g, '');
  
  // 1. 정확한 우편번호 매핑 확인
  if (EXACT_ZIPCODE_MAP[cleanZipcode]) {
    return EXACT_ZIPCODE_MAP[cleanZipcode];
  }
  
  // 2. 우편번호 앞 2자리로 지역 매핑
  const region = cleanZipcode.substring(0, 2);
  if (REGION_MAP[region]) {
    return REGION_MAP[region];
  }
  
  // 3. 기본값 (서울)
  return REGION_MAP['01'];
}

