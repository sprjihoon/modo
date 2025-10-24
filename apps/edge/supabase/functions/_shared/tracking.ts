/**
 * Tracking Number 생성 유틸리티
 * 형식: KPOST + yymmdd + 5자리 랜덤
 */

/**
 * tracking_no 생성
 * @returns KPOST + yymmdd + 5자리 랜덤 (예: KPOST25012412345)
 */
export function generateTrackingNo(): string {
  const now = new Date();
  
  // yymmdd 생성
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const dateStr = yy + mm + dd;
  
  // 5자리 랜덤 숫자 (10000 ~ 99999)
  const random5 = Math.floor(10000 + Math.random() * 90000);
  
  return `KPOST${dateStr}${random5}`;
}

/**
 * tracking_no 검증
 * @param trackingNo 검증할 송장번호
 * @returns 유효한 형식인지 여부
 */
export function validateTrackingNo(trackingNo: string): boolean {
  // KPOST + 6자리 날짜 + 5자리 숫자 = 총 16자
  const pattern = /^KPOST\d{11}$/;
  return pattern.test(trackingNo);
}

