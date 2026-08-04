/// 알림 본문에서 긴 주문번호(ORD…)를 제거해 읽기 쉽게 만든다.
///
/// 예)
///  - "주문(ORD1783310422013)이 취소되었습니다." → "주문이 취소되었습니다."
///  - "'허리 줄임' (주문 ORD123) 의 반송…" → "'허리 줄임'의 반송…"
String formatNotificationBody(String? body) {
  if (body == null || body.isEmpty) return '';

  var text = body
      .replaceAll(RegExp(r'주문\s*\(\s*ORD\d+\s*\)', caseSensitive: false), '주문')
      .replaceAll(RegExp(r'\(\s*주문\s*ORD\d+\s*\)', caseSensitive: false), '')
      .replaceAll(RegExp(r'\bORD\d+\b', caseSensitive: false), '');

  text = text
      .replaceAll(RegExp(r'\s{2,}'), ' ')
      .replaceAll(RegExp(r'\s+의'), '의')
      .replaceAll(RegExp(r'\s+이'), '이')
      .replaceAll(RegExp(r'\s+가'), '가')
      .replaceAll(RegExp(r'\(\s*\)'), '')
      .trim();

  return text;
}
