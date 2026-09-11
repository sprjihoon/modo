import '../domain/review_models.dart';

/// 홈·목록에 항상 붙이는 미리보기 4건. DB 공개 리뷰와 내용이 같으면 중복하지 않는다.

const previewAverage = 5.0;
const previewCount = 4;

final previewReviews = <PublicReview>[
  PublicReview(
    id: 'preview-1',
    rating: 5,
    content: '기장이 딱 맞게 나왔어요. 택배 수거도 편하고 마감이 깔끔합니다.',
    photoUrls: const [],
    displayName: '김**',
    clothingType: '바지',
    repairSummary: '바지 · 기장수선',
    pointsType: 'text',
    reviewedAt: DateTime.utc(2026, 8, 20, 9),
  ),
  PublicReview(
    id: 'preview-2',
    rating: 5,
    content: '지퍼 교체했는데 새 옷처럼 됐습니다. 마감이 꼼꼼합니다.',
    photoUrls: const [],
    displayName: '이**',
    clothingType: '아우터',
    repairSummary: '점퍼 · 지퍼수선',
    pointsType: 'text',
    reviewedAt: DateTime.utc(2026, 8, 18, 9),
  ),
  PublicReview(
    id: 'preview-3',
    rating: 5,
    content: '허리 수선이 자연스러워요. 입었을 때 라인도 예쁘고 만족합니다.',
    photoUrls: const [],
    displayName: '박**',
    clothingType: '치마',
    repairSummary: '스커트 · 허리수선',
    pointsType: 'text',
    reviewedAt: DateTime.utc(2026, 8, 15, 9),
  ),
  PublicReview(
    id: 'preview-4',
    rating: 5,
    content: '코트 단추와 안감까지 신경 써 주셨어요. 다음에도 여기로 맡기려고요.',
    photoUrls: const [],
    displayName: '정**',
    clothingType: '아우터',
    repairSummary: '코트 · 단추수선',
    pointsType: 'text',
    reviewedAt: DateTime.utc(2026, 8, 5, 9),
  ),
];

String previewReviewKey(PublicReview review) => '${review.displayName.trim()}|${review.content.trim()}';

List<PublicReview> ensurePreviewReviews(
  List<PublicReview> reviews, {
  bool photoOnly = false,
  String clothing = '',
}) {
  final wanted = previewReviews.where((preview) {
    if (photoOnly && preview.photoUrls.isEmpty) return false;
    if (clothing.isNotEmpty && preview.clothingType != clothing) return false;
    return true;
  });
  final seen = reviews.map(previewReviewKey).toSet();
  final extra = wanted.where((preview) => !seen.contains(previewReviewKey(preview)));
  return extra.isEmpty ? reviews : [...reviews, ...extra];
}

ReviewListResult withSampleReviews(
  List<PublicReview> reviews, {
  bool photoOnly = false,
  String clothing = '',
}) {
  final merged = ensurePreviewReviews(reviews, photoOnly: photoOnly, clothing: clothing);
  final extra = merged.length - reviews.length;
  if (reviews.isEmpty) {
    return ReviewListResult(
      reviews: merged,
      mine: const [],
      count: merged.length,
      average: merged.isEmpty ? 0 : previewAverage,
    );
  }
  final average =
      (merged.fold<int>(0, (sum, r) => sum + r.rating) / merged.length * 10).round() / 10;
  return ReviewListResult(
    reviews: merged,
    mine: const [],
    count: reviews.length + extra,
    average: average,
  );
}
