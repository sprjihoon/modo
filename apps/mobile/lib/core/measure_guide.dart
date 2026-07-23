// 웹 `lib/measure-guide.ts` 와 동기화된 치수 가이드 키 해석.

const _validIds = {
  'sleeve-length',
  'shoulder',
  'width-top',
  'total-length-top',
  'arm-width',
  'total-length-bottom',
  'waist-hip',
  'leg-width',
  'rise',
  'length-leg-width',
};

String _normalize(String text) =>
    text.toLowerCase().replaceAll(RegExp(r'\s+'), '').replaceAll(RegExp(r'[-_/]'), '');

bool _clothingHintIsBottom(String? hint) {
  if (hint == null || hint.isEmpty) return false;
  final n = _normalize(hint);
  return n.contains('바지') ||
      n.contains('스커트') ||
      n.contains('치마') ||
      n.contains('하의') ||
      n.contains('bottom') ||
      n.contains('pants') ||
      n.contains('skirt') ||
      n.contains('shorts') ||
      n.contains('반바지') ||
      n.contains('청바지');
}

bool _clothingHintIsTop(String? hint) {
  if (hint == null || hint.isEmpty) return false;
  final n = _normalize(hint);
  return n.contains('상의') ||
      n.contains('자켓') ||
      n.contains('재킷') ||
      n.contains('코트') ||
      n.contains('셔츠') ||
      n.contains('블라우스') ||
      n.contains('니트') ||
      n.contains('티셔츠') ||
      n.contains('원피스') ||
      n.contains('아우터') ||
      n.contains('top') ||
      n.contains('jacket') ||
      n.contains('coat') ||
      n.contains('shirt') ||
      n.contains('dress');
}

/// DB key 우선, 없으면 이름/의류 힌트로 추정.
String? resolveMeasureGuideId(
  String? itemName, {
  String? measureGuideKey,
  String? clothingHint,
}) {
  final key = measureGuideKey?.trim();
  if (key != null && key.isNotEmpty && _validIds.contains(key)) {
    return key;
  }

  final hints = [itemName, clothingHint].whereType<String>().join(' ');
  if (hints.trim().isEmpty) return null;

  final n = _normalize(hints);
  final isBottom = _clothingHintIsBottom(clothingHint) ||
      _clothingHintIsBottom(itemName) ||
      n.contains('바지') ||
      n.contains('스커트') ||
      n.contains('치마') ||
      n.contains('청바지');
  final isTop = !isBottom &&
      (_clothingHintIsTop(clothingHint) ||
          _clothingHintIsTop(itemName) ||
          n.contains('상의') ||
          n.contains('원피스'));

  if (n.contains('소매기장') || n.contains('소매길이') || n.contains('sleeve')) {
    return 'sleeve-length';
  }
  if (n.contains('소매') &&
      (n.contains('줄임') || n.contains('기장') || n.contains('길이'))) {
    return 'sleeve-length';
  }
  if (n.contains('어깨')) return 'shoulder';
  if (n.contains('팔통') || (n.contains('arm') && n.contains('width'))) {
    return 'arm-width';
  }
  if (n.contains('밑위') || n.contains('rise') || n.contains('가랑이')) {
    return 'rise';
  }

  if (n.contains('전체품') ||
      n.contains('품줄임') ||
      (n.contains('품') && !n.contains('팔통') && !n.contains('힙'))) {
    return 'width-top';
  }

  if (n.contains('허리힙') ||
      n.contains('허리') ||
      n.contains('힙') ||
      n.contains('엉덩이') ||
      n.contains('히프') ||
      n.contains('hip') ||
      n.contains('waist')) {
    return 'waist-hip';
  }

  if (n.contains('기장') && n.contains('밑통')) {
    return 'length-leg-width';
  }

  if (n.contains('전체통') ||
      n.contains('통줄임') ||
      n.contains('바지통') ||
      n.contains('스커트통') ||
      (n.contains('통') && isBottom && !n.contains('팔통') && !n.contains('기장'))) {
    return 'leg-width';
  }

  if (n.contains('총기장') ||
      n.contains('기장줄임') ||
      n.contains('밑단') ||
      (n.contains('기장') && !n.contains('소매'))) {
    if (isBottom) return 'total-length-bottom';
    if (isTop) return 'total-length-top';
    return isBottom ? 'total-length-bottom' : 'total-length-top';
  }

  return null;
}

/// Flutter WebView 임베드 URL (웹 `/guide/measure?embed=1`).
String measureGuideEmbedUrl(String? typeId, {String baseUrl = 'https://modo.io.kr'}) {
  final base = baseUrl.replaceAll(RegExp(r'/$'), '');
  final params = <String, String>{'embed': '1'};
  if (typeId != null && typeId.isNotEmpty) {
    params['type'] = typeId;
  }
  return Uri.parse('$base/guide/measure').replace(queryParameters: params).toString();
}
