/** KST(UTC+9) 기준 YYYYMMDD */
export function toKstYmd(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, '0')}${String(kst.getUTCDate()).padStart(2, '0')}`;
}

function isYmd(value?: string): value is string {
  return !!value && /^\d{8}$/.test(value);
}

/**
 * 우체국 취소/조회용 신청일자 후보.
 * UTC 날짜를 넣으면 ERR-123(예약 없음)이 나므로 KST·reqNo 접두어를 함께 시도한다.
 */
export function resolveCancelReqYmds(opts: {
  storedReqYmd?: string;
  resDate?: string;
  reqNo?: string;
  pickupRequestedAt?: string;
  createdAt?: string;
}): string[] {
  const candidates: string[] = [];
  const push = (value?: string) => {
    if (isYmd(value) && !candidates.includes(value)) candidates.push(value);
  };

  push(opts.storedReqYmd);
  if (opts.resDate && opts.resDate.length >= 8) push(opts.resDate.substring(0, 8));
  if (opts.reqNo && opts.reqNo.length >= 8) push(opts.reqNo.substring(0, 8));
  if (opts.pickupRequestedAt) push(toKstYmd(opts.pickupRequestedAt));
  if (opts.createdAt) push(toKstYmd(opts.createdAt));
  if (candidates.length === 0) push(toKstYmd(new Date()));
  return candidates;
}

export function isEpostNoReservationError(message?: string): boolean {
  if (!message) return false;
  return (
    message.includes('ERR-123') ||
    message.includes('예약된 정보가 없습니다') ||
    message.includes('접수정보로 예약된 정보가 없')
  );
}
