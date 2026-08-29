import '../domain/review_models.dart';

/// 테스트·디자인 확인용. 홈·목록은 이 파일을 쓰지 않고 API/DB만 사용한다.

const previewAverage = 5.0;
const previewCount = 4;

final previewReviews = <PublicReview>[
  PublicReview(
    id: 'preview-1',
    rating: 5,
    content: '기장이 딱 맞게 나왔어요. 택배 수거도 편하고 마감이 깔끔합니다.',
    photoUrls: const [],
    displayName: '김**',
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
    repairSummary: '코트 · 단추수선',
    pointsType: 'text',
    reviewedAt: DateTime.utc(2026, 8, 5, 9),
  ),
];

ReviewListResult withSampleReviews(List<PublicReview> reviews) {
  if (reviews.isNotEmpty) {
    final average =
        (reviews.fold<int>(0, (sum, r) => sum + r.rating) / reviews.length * 10).round() / 10;
    return ReviewListResult(
      reviews: reviews,
      mine: const [],
      count: reviews.length,
      average: average,
    );
  }
  return ReviewListResult(
    reviews: previewReviews,
    mine: const [],
    count: previewCount,
    average: previewAverage,
  );
}
