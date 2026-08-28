/** 포인트 내역에 보이는 설명. DB 매칭용 intent UUID는 숨긴다. */
export function formatPointDescription(
  raw: string | null | undefined,
  isEarn: boolean,
): string {
  let text = (raw ?? "").trim();
  text = text.replace(/\s*\(intent:[^)]+\)/g, "");
  text = text.replace(/\s*intent:[0-9a-fA-F-]{8,}/g, "");
  text = text.trim();

  if (text.includes("예약 해제")) return "포인트 사용 취소";
  if (text.includes("포인트 사용")) return "포인트 사용";
  if (!text) return isEarn ? "포인트 적립" : "포인트 사용";
  return text;
}
