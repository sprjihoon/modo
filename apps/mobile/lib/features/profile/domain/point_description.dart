/// 포인트 내역에 보이는 설명. DB에는 매칭용 intent UUID가 붙어 있다.
String formatPointDescription(String? raw, {required bool isEarn}) {
  var text = (raw ?? '').trim();
  text = text.replaceAll(RegExp(r'\s*\(intent:[^)]+\)'), '');
  text = text.replaceAll(RegExp(r'\s*intent:[0-9a-fA-F-]{8,}'), '');
  text = text.trim();

  if (text.contains('예약 해제')) return '포인트 사용 취소';
  if (text.contains('포인트 사용')) return '포인트 사용';
  if (text.isEmpty) return isEarn ? '포인트 적립' : '포인트 사용';
  return text;
}
