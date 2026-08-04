/**
 * 알림 본문에서 긴 주문번호(ORD…)를 제거해 읽기 쉽게 만든다.
 * 저장값은 그대로 두고 표시용으로만 사용한다.
 *
 * 예)
 *  - "주문(ORD1783310422013)이 취소되었습니다." → "주문이 취소되었습니다."
 *  - "'허리 줄임' (주문 ORD123) 의 반송…" → "'허리 줄임'의 반송…"
 */
export function formatNotificationBody(body?: string | null): string {
  if (!body) return "";

  return body
    // 주문(ORD123…) / 주문 (ORD123…)
    .replace(/주문\s*\(\s*ORD\d+\s*\)/gi, "주문")
    // (주문 ORD123…) / (주문ORD123…)
    .replace(/\(\s*주문\s*ORD\d+\s*\)/gi, "")
    // 단독 ORD 번호
    .replace(/\bORD\d+\b/gi, "")
    // 공백·조사 정리
    .replace(/\s{2,}/g, " ")
    .replace(/\s+의/g, "의")
    .replace(/\s+이/g, "이")
    .replace(/\s+가/g, "가")
    .replace(/\(\s*\)/g, "")
    .trim();
}
