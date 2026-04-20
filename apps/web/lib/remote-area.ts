/**
 * 우체국 도서산간 지역 판정 유틸리티
 * 우체국 소포/등기 기준 도서산간 추가 요금 적용 지역
 *
 * 추가 요금은 관리자 페이지(shipping_settings.remote_area_fee)에서 변경합니다.
 * 아래 상수는 폴백/하위 호환용입니다.
 */

export const REMOTE_AREA_FEE_DEFAULT = 400; // 폴백 추가비 (관리자 설정 미존재 시)
/** @deprecated shipping_settings.remote_area_fee 사용 */
export const REMOTE_AREA_FEE_ONE_WAY = 400;
/** @deprecated shipping_settings.remote_area_fee 사용 */
export const REMOTE_AREA_FEE_ROUNDTRIP = 800;

/**
 * 우체국 도서산간 우편번호 목록
 * 출처: 우체국 도서산간 지역 고시 (5자리 우편번호 기준)
 * 
 * 주요 포함 지역:
 * - 제주특별자치도 전체 (63xxx)
 * - 경북 울릉군 (40240)
 * - 인천 옹진군 도서 (백령, 대청, 소청, 연평, 덕적, 자월, 영흥 등)
 * - 전남 신안군 도서 (압해 제외 일부)
 * - 경남 통영시 도서, 고성군 도서
 * - 기타 도서 지역
 */

// 우편번호 범위로 판정 (제주 등 연속된 경우)
const REMOTE_ZIPCODE_RANGES: [number, number][] = [
  [63000, 63999], // 제주특별자치도 전체
];

// 개별 우편번호 (도서산간 지정 지역)
const REMOTE_ZIPCODES = new Set<string>([
  // 경북 울릉군
  "40240",

  // 인천 옹진군 도서 지역
  "23010", "23011", "23012", "23013", "23014", "23015", "23016", "23017", "23018", "23019", // 백령면
  "23040", "23041", "23042", "23043", "23044", "23045", "23046", "23047", "23048", "23049", // 연평면
  "23070", "23071", "23072", "23073", "23074", "23075", "23076", "23077", "23078", "23079", // 덕적면
  "23080", "23081", "23082", "23083", "23084", "23085", "23086", "23087", "23088", "23089", // 자월면
  "23060", "23061", "23062", "23063", "23064", "23065", "23066", "23067", "23068", "23069", // 대청면

  // 전남 신안군 도서
  "58800", "58801", "58802", "58803", "58804", "58805", "58806", "58807", "58808", "58809",
  "58810", "58811", "58812", "58813", "58814", "58815", "58816", "58817", "58818", "58819",
  "58820", "58821", "58822", "58823", "58824", "58825", "58826", "58827", "58828", "58829",
  "58830", "58831", "58832", "58833", "58834", "58835", "58836", "58837", "58838", "58839",

  // 전남 완도군 도서
  "59100", "59101", "59102", "59103", "59104", "59105", "59106", "59107", "59108", "59109",
  "59110", "59111", "59112", "59113", "59114", "59115", "59116", "59117", "59118", "59119",

  // 전남 진도군 도서 (조도면 등)
  "58960", "58961", "58962", "58963", "58964", "58965",

  // 경남 통영시 도서 (한산면, 욕지면, 사량면 등)
  "53047", "53048", "53049", "53050", "53051", "53052", "53053",

  // 경남 남해군 도서
  "52427", "52428", "52429", "52430",

  // 충남 보령시 도서 (원산도, 삽시도 등)
  "33411", "33412", "33413", "33414", "33415",

  // 인천 강화군 도서 (교동도, 서도면 등)
  "23071", "23072", "23073",

  // 경기 화성시 도서 (우정읍 일부)
  "18574", "18575", "18576",
]);

// 주소 문자열에서 도서산간 여부 판정 (우편번호가 없을 때 보조 수단)
const REMOTE_AREA_KEYWORDS = [
  "울릉군", "울릉도",
  "백령", "연평도", "덕적도", "자월도", "영흥도", "대청도",
  "신안군", "흑산도", "홍도", "비금도", "도초도", "팔금도", "안좌도",
  "완도군", "노화도", "보길도", "소안도", "청산도",
  "진도군 조도", "욕지도", "한산도", "사량도",
  "원산도", "삽시도",
];

/**
 * 우편번호로 도서산간 여부 판정
 */
export function isRemoteAreaByZipcode(zipcode: string): boolean {
  if (!zipcode) return false;
  const zip = zipcode.replace(/\D/g, "").slice(0, 5);
  if (zip.length < 5) return false;

  // 범위 체크 (제주 등)
  const zipNum = parseInt(zip, 10);
  for (const [min, max] of REMOTE_ZIPCODE_RANGES) {
    if (zipNum >= min && zipNum <= max) return true;
  }

  // 개별 우편번호 체크
  return REMOTE_ZIPCODES.has(zip);
}

/**
 * 주소 문자열로 도서산간 여부 판정 (보조)
 */
export function isRemoteAreaByAddress(address: string): boolean {
  if (!address) return false;
  return REMOTE_AREA_KEYWORDS.some((kw) => address.includes(kw));
}

/**
 * 우편번호 + 주소 모두 체크해서 도서산간 판정
 */
export function isRemoteArea(zipcode: string, address?: string): boolean {
  if (isRemoteAreaByZipcode(zipcode)) return true;
  if (address && isRemoteAreaByAddress(address)) return true;
  return false;
}

/**
 * 도서산간 추가 배송비 계산
 * @param zipcode  우편번호
 * @param address  보조 주소 문자열
 * @param feeAmount 도서산간일 때 부과할 금액 (없으면 REMOTE_AREA_FEE_DEFAULT)
 * @returns 추가 금액 (도서산간이면 feeAmount, 아니면 0)
 */
export function getRemoteAreaFee(
  zipcode: string,
  address?: string,
  feeAmount: number = REMOTE_AREA_FEE_DEFAULT
): number {
  return isRemoteArea(zipcode, address) ? feeAmount : 0;
}
