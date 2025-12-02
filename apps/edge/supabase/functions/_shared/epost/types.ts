/**
 * 우체국 API 타입 정의
 */

export interface EPostConfig {
  apiKey: string;      // 인증키
  securityKey: string; // 보안키 (SEED128 암호화용)
  custNo: string;      // 고객번호
}

/**
 * 소포신청(픽업요청) 파라미터
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

/**
 * 소포신청 응답
 */
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
 * 소포신청 확인 파라미터
 * API ID: SHPAPI-R02-01
 */
export interface GetResInfoParams {
  custNo: string;
  reqType: '1' | '2';  // 1:일반소포, 2:반품소포
  orderNo: string;     // 주문번호
  reqYmd: string;      // 소포신청 등록일자 (YYYYMMDD)
}

/**
 * 소포신청 확인 응답
 */
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
 * 우체국명 조회 파라미터
 * 공공데이터포털 - 우체국명 조회 API
 * API 키: c9199c6be5cf67e8b1764577878692
 */
export interface PostOfficeParams {
  zipcode: string;     // 우편번호 (5자리)
}

/**
 * 우체국명 조회 응답
 */
export interface PostOfficeResponse {
  postOfficeName?: string;  // 우체국명
  zipcode?: string;         // 우편번호
  address?: string;         // 주소
}

/**
 * 집배코드 조회 파라미터
 * 공공데이터포털 - 집배구 구분코드 조회서비스
 * API 키: c9199c6be5cf67e8e1764577163889
 */
export interface DeliveryCodeParams {
  zipcode: string;     // 우편번호 (5자리)
}

/**
 * 집배코드 조회 응답
 * 우체국 공공데이터 API 응답 필드 (공식 문서 기준)
 */
export interface DeliveryCodeResponse {
  arrCnpoNm?: string;       // 도착집중국명(소포) - 예: "대구M"
  delivPoNm?: string;       // 배달우체국명(소포) - 예: "동대구"
  delivAreaCd?: string;     // 집배코드(소포) - 예: "-560-"
  printAreaCd?: string;     // 인쇄용 집배코드 - 예: "경1 701 56 05"
  courseNo?: string;        // 구분 코스 (v1.4)
  
  // 파싱된 분류 코드
  sortCode1?: string;       // 분류 코드 1 (경1)
  sortCode2?: string;       // 분류 코드 2 (701)
  sortCode3?: string;       // 분류 코드 3 (56)
  sortCode4?: string;       // 분류 코드 4 (05)
}

/**
 * 소포신청 취소 파라미터
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

/**
 * 소포신청 취소 응답
 */
export interface CancelOrderResponse {
  reqNo: string;
  resNo: string;
  cancelRegiNo: string;      // 취소 대상 운송장번호
  cancelDate: string;        // 취소 일시
  canceledYn: 'Y' | 'N' | 'D'; // Y:취소, N:미취소, D:삭제
  regiNo?: string;           // 취소 후 변경된 운송장번호
  notCancelReason?: string;  // 미취소 사유
}

