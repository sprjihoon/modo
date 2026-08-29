import '../domain/review_models.dart';

const previewAverage = 5.0;
const previewCount = 5;

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
    content: '지퍼 교체했는데 새 옷처럼 됐습니다. 사진처럼 꼼꼼하게 해주셨어요.',
    photoUrls: const [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=400&h=400&q=80',
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=400&h=400&q=80',
    ],
    displayName: '이**',
    repairSummary: '점퍼 · 지퍼수선',
    pointsType: 'photo',
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
    content: '소매 기장 줄였는데 비율이 잘 맞아요. 배송도 빠르고 포장도 정성스러웠습니다.',
    photoUrls: const [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&h=400&q=80',
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=400&h=400&q=80',
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=400&h=400&q=80',
    ],
    displayName: '최**',
    repairSummary: '셔츠 · 소매기장',
    pointsType: 'photo',
    reviewedAt: DateTime.utc(2026, 8, 10, 9),
  ),
  PublicReview(
    id: 'preview-5',
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
