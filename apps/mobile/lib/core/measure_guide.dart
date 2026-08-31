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

const _compositeGuides = {
  'length-leg-width': ['total-length-bottom', 'leg-width'],
};

class MeasureGuideDailyItem {
  final String label;
  final String desc;
  final String image;

  const MeasureGuideDailyItem({
    required this.label,
    required this.desc,
    required this.image,
  });
}

/// 웹 MeasureGuideClient TYPES와 동기화된 비교·일상 가이드.
class MeasureGuideType {
  final String id;
  final String name;
  final String clothing;
  final String foldBaseline;
  final String foldNote;
  final String measurePart;
  final String foldImage;
  final String compareImage;
  final List<MeasureGuideDailyItem> daily;
  final List<String> notes;

  const MeasureGuideType({
    required this.id,
    required this.name,
    required this.clothing,
    required this.foldBaseline,
    required this.foldNote,
    required this.measurePart,
    required this.foldImage,
    required this.compareImage,
    this.daily = const [],
    this.notes = const [],
  });
}

const measureGuideAssetBase = 'https://modo.io.kr';

String measureGuideAssetUrl(String path) {
  final clean = path.startsWith('/') ? path : '/$path';
  return '$measureGuideAssetBase$clean';
}

const measureGuideTypes = <MeasureGuideType>[
  MeasureGuideType(
    id: 'sleeve-length',
    name: '소매기장 줄임',
    clothing: 'top',
    foldBaseline: '한 쪽 목선',
    foldNote: '아우터, 상의, 원피스 공통',
    measurePart: '소매기장',
    foldImage: '/images/measure/guide/sleeve-length-fold.png',
    compareImage: '/images/measure/guide/sleeve-length-compare.png',
    daily: [
      MeasureGuideDailyItem(
        label: '소매 기장 측정',
        desc: '소매 재단선부터 소매 끝 점까지의 길이를 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.',
        image: '/images/measure/guide/sleeve-length-daily.png',
      ),
      MeasureGuideDailyItem(
        label: '전체 팔통 측정',
        desc: '겨드랑이 끝 점에서부터 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.',
        image: '/images/measure/guide/arm-width-daily.png',
      ),
    ],
    notes: ['어깨 길이를 줄이게 되면, 그만큼 소매 기장도 함께 줄어듭니다.'],
  ),
  MeasureGuideType(
    id: 'shoulder',
    name: '어깨길이 줄임',
    clothing: 'top',
    foldBaseline: '한 쪽 목선',
    foldNote: '아우터, 상의, 원피스 공통',
    measurePart: '어깨 길이',
    foldImage: '/images/measure/guide/shoulder-fold.png',
    compareImage: '/images/measure/guide/shoulder-compare.png',
    daily: [
      MeasureGuideDailyItem(
        label: '어깨 길이 측정',
        desc: '한쪽 목선에서부터 소매 재단선 까지의 길이를 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.',
        image: '/images/measure/guide/shoulder-daily.png',
      ),
    ],
    notes: ['어깨 길이를 줄이게 되면, 그만큼 소매 기장도 함께 줄어듭니다.'],
  ),
  MeasureGuideType(
    id: 'width-top',
    name: '전체 품 줄임 (상의, 원피스)',
    clothing: 'top',
    foldBaseline: '겨드랑이 선',
    foldNote: '아우터, 상의, 원피스 공통',
    measurePart: '전체 품',
    foldImage: '/images/measure/guide/width-top-fold.png',
    compareImage: '/images/measure/guide/width-top-compare.png',
    daily: [
      MeasureGuideDailyItem(
        label: '전체 품 측정',
        desc: '겨드랑이 선에서부터 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.',
        image: '/images/measure/guide/width-top-daily.png',
      ),
    ],
  ),
  MeasureGuideType(
    id: 'total-length-top',
    name: '총 기장 줄임 (상의, 원피스)',
    clothing: 'top',
    foldBaseline: '어깨선',
    foldNote: '아우터, 상의, 원피스 공통',
    measurePart: '총 기장',
    foldImage: '/images/measure/guide/total-length-top-fold.png',
    compareImage: '/images/measure/guide/total-length-top-compare.png',
    daily: [
      MeasureGuideDailyItem(
        label: '상의 총 기장 측정',
        desc: '목선 끝에서부터 밑단 끝까지 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.',
        image: '/images/measure/guide/total-length-top-daily.png',
      ),
    ],
  ),
  MeasureGuideType(
    id: 'arm-width',
    name: '전체팔통 줄임',
    clothing: 'top',
    foldBaseline: '겨드랑이 선',
    foldNote: '아우터, 상의, 원피스 공통',
    measurePart: '전체 팔통',
    foldImage: '/images/measure/guide/arm-width-fold.png',
    compareImage: '/images/measure/guide/arm-width-compare.png',
    daily: [
      MeasureGuideDailyItem(
        label: '전체 팔통 측정',
        desc: '겨드랑이 끝 점에서부터 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.',
        image: '/images/measure/guide/arm-width-daily.png',
      ),
    ],
  ),
  MeasureGuideType(
    id: 'total-length-bottom',
    name: '총 기장 줄임 (바지, 스커트)',
    clothing: 'bottom',
    foldBaseline: '허리 끝선',
    foldNote: '바지, 치마 공통',
    measurePart: '총 기장',
    foldImage: '/images/measure/guide/total-length-bottom-fold.png',
    compareImage: '/images/measure/guide/total-length-bottom-compare.png',
    daily: [
      MeasureGuideDailyItem(
        label: '하의 총 기장 측정',
        desc: '벨트 선에서부터 밑단 끝 까지 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.',
        image: '/images/measure/guide/bottom-length-daily.png',
      ),
    ],
    notes: [
      '밑위 길이가 같은 바지로 비교를 하셔야 합니다.',
      '밑위가 다른 경우, 직접 입고 기장을 접어서 측정해야 정확한 측정이 가능합니다.',
    ],
  ),
  MeasureGuideType(
    id: 'waist-hip',
    name: '허리/힙 줄임',
    clothing: 'bottom',
    foldBaseline: '허리 및 엉덩이 옆선',
    foldNote: '바지, 치마 공통',
    measurePart: '허리와 힙',
    foldImage: '/images/measure/guide/waist-hip-fold.png',
    compareImage: '/images/measure/guide/waist-hip-compare.png',
    daily: [
      MeasureGuideDailyItem(
        label: '허리/힙 측정',
        desc: '허리 및 엉덩이 옆 선에서부터 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.',
        image: '/images/measure/guide/waist-hip-daily.png',
      ),
    ],
    notes: ['허리, 힙 일부만 줄이실 경우 줄이고 싶은 부위의 cm 입력이 필요합니다.'],
  ),
  MeasureGuideType(
    id: 'leg-width',
    name: '전체 통 줄임 (바지, 스커트)',
    clothing: 'bottom',
    foldBaseline: '밑위 선',
    foldNote: '바지, 치마 공통',
    measurePart: '전체 통',
    foldImage: '/images/measure/guide/leg-width-fold.png',
    compareImage: '/images/measure/guide/leg-width-compare.png',
    daily: [
      MeasureGuideDailyItem(
        label: '전체 통 측정',
        desc: '허벅지 좌우 끝점까지 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.',
        image: '/images/measure/guide/leg-width-daily.png',
      ),
    ],
    notes: ['허벅지, 종아리, 발목(밑동)을 다르게 줄이실 경우 부위 별 cm 입력이 필요합니다.'],
  ),
  MeasureGuideType(
    id: 'rise',
    name: '밑위 줄임',
    clothing: 'bottom',
    foldBaseline: '허리 끝선',
    foldNote: '바지, 치마 공통',
    measurePart: '밑위',
    foldImage: '/images/measure/guide/rise-fold.png',
    compareImage: '/images/measure/guide/rise-compare.png',
    daily: [
      MeasureGuideDailyItem(
        label: '밑위 측정',
        desc: '지퍼 벨트 선에서부터 일직선으로 측정 후, 줄이고자 하는 길이를 입력해주세요.',
        image: '/images/measure/guide/rise-daily.png',
      ),
    ],
    notes: [
      '밑위 길이가 같은 바지로 비교를 하셔야 합니다.',
      '밑위가 다른 경우, 직접 입고 기장을 접어서 측정해야 정확한 측정이 가능합니다.',
    ],
  ),
];

List<String> expandMeasureGuideTypeIds(String? guideId) {
  final key = guideId?.trim() ?? '';
  if (key.isEmpty) return const [];
  final composite = _compositeGuides[key];
  if (composite != null) return List<String>.from(composite);
  if (measureGuideTypes.any((t) => t.id == key)) return [key];
  return const [];
}

List<MeasureGuideType> allowedMeasureGuideTypes(String? guideId) {
  final ids = expandMeasureGuideTypeIds(guideId);
  if (ids.isEmpty) return measureGuideTypes;
  final filtered = [
    for (final id in ids)
      ...measureGuideTypes.where((t) => t.id == id),
  ];
  return filtered.isEmpty ? measureGuideTypes : filtered;
}

String _normalize(String text) =>
    text.toLowerCase().replaceAll(RegExp(r'\s+'), '').replaceAll(RegExp(r'[-_/()]'), '');

const _topOnlyGuideIds = {
  'sleeve-length',
  'shoulder',
  'width-top',
  'total-length-top',
  'arm-width',
};

const _bottomOnlyGuideIds = {
  'total-length-bottom',
  'waist-hip',
  'leg-width',
  'rise',
  'length-leg-width',
};

bool _clothingHintIsBottom(String? hint) {
  if (hint == null || hint.isEmpty) return false;
  final n = _normalize(hint);
  return n.contains('바지') ||
      n.contains('스커트') ||
      n.contains('치마') ||
      n.contains('하의') ||
      n.contains('팬츠') ||
      n.contains('슬랙스') ||
      n.contains('레깅스') ||
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
      n.contains('맨투맨') ||
      n.contains('후드') ||
      n.contains('패딩') ||
      n.contains('점퍼') ||
      n.contains('가디건') ||
      n.contains('top') ||
      n.contains('jacket') ||
      n.contains('coat') ||
      n.contains('shirt') ||
      n.contains('dress');
}

bool _clothingLooksBottom(String? itemName, String? clothingHint) {
  final hints = [itemName, clothingHint].whereType<String>().join(' ');
  final n = _normalize(hints);
  return _clothingHintIsBottom(clothingHint) ||
      _clothingHintIsBottom(itemName) ||
      n.contains('바지') ||
      n.contains('스커트') ||
      n.contains('치마') ||
      n.contains('청바지') ||
      n.contains('하의') ||
      n.contains('팬츠') ||
      n.contains('슬랙스') ||
      n.contains('레깅스');
}

bool _clothingLooksTop(String? itemName, String? clothingHint) {
  if (_clothingLooksBottom(itemName, clothingHint)) return false;
  final hints = [itemName, clothingHint].whereType<String>().join(' ');
  final n = _normalize(hints);
  return _clothingHintIsTop(clothingHint) ||
      _clothingHintIsTop(itemName) ||
      n.contains('상의') ||
      n.contains('원피스');
}

/// 웹 `inferMeasureGuideId`와 동일 규칙.
String? inferMeasureGuideId(String? itemName, {String? clothingHint}) {
  final hints = [itemName, clothingHint].whereType<String>().join(' ');
  if (hints.trim().isEmpty) return null;

  final n = _normalize(hints);
  final isBottom = _clothingLooksBottom(itemName, clothingHint);
  final isTop = _clothingLooksTop(itemName, clothingHint);

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
      n.contains('밑통') ||
      (n.contains('통') && isBottom && !n.contains('팔통') && !n.contains('기장'))) {
    return 'leg-width';
  }

  if (n.contains('총기장') ||
      n.contains('기장줄임') ||
      n.contains('밑단') ||
      (n.contains('기장') && !n.contains('소매'))) {
    if (isBottom) return 'total-length-bottom';
    if (isTop) return 'total-length-top';
    return n.contains('총기장') ? 'total-length-top' : 'total-length-bottom';
  }

  return null;
}

String _remapStoredKeyToClothing(String stored, bool isBottom, bool isTop) {
  if (isBottom && _topOnlyGuideIds.contains(stored)) {
    return stored == 'width-top' ? 'waist-hip' : 'total-length-bottom';
  }
  if (isTop && _bottomOnlyGuideIds.contains(stored)) {
    if (stored == 'waist-hip') return 'width-top';
    return 'total-length-top';
  }
  return stored;
}

/// 웹 `resolveMeasureGuideId`와 동일 규칙.
String? resolveMeasureGuideId(
  String? itemName, {
  String? measureGuideKey,
  String? clothingHint,
}) {
  final inferred = inferMeasureGuideId(itemName, clothingHint: clothingHint);
  if (inferred != null) return inferred;

  final key = measureGuideKey?.trim();
  if (key != null && key.isNotEmpty && _validIds.contains(key)) {
    return _remapStoredKeyToClothing(
      key,
      _clothingLooksBottom(itemName, clothingHint),
      _clothingLooksTop(itemName, clothingHint),
    );
  }

  return null;
}

/// WebView가 보낸 가이드 높이. 탭이 짧아져도 새 높이를 받는다.
double? parseMeasureGuideHeightMessage(String raw, {double? current}) {
  final parsed = double.tryParse(raw.replaceAll(RegExp(r'[^0-9.]'), ''));
  if (parsed == null || parsed < 80) return null;
  if (current != null && (parsed - current).abs() < 8) return current;
  return parsed;
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
