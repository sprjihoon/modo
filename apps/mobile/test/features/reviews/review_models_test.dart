import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/reviews/data/review_samples.dart';
import 'package:modu_repair/features/reviews/domain/review_models.dart';

void main() {
  group('PublicReview.fromJson', () {
    test('공개 리뷰 API 응답을 파싱한다', () {
      final review = PublicReview.fromJson({
        'id': 'r1',
        'rating': 5,
        'content': '마감이 깔끔합니다.',
        'photo_urls': ['https://example.com/a.jpg'],
        'display_name': '장**',
        'repair_summary': '바지 · 기장수선',
        'clothing_type': '바지',
        'points_type': 'photo',
        'reviewed_at': '2026-08-20T09:00:00.000Z',
      });

      expect(review.id, 'r1');
      expect(review.rating, 5);
      expect(review.isPhoto, isTrue);
      expect(review.displayName, '장**');
      expect(review.repairSummary, '바지 · 기장수선');
      expect(review.clothingType, '바지');
      expect(review.reviewedAt.toUtc().toIso8601String().startsWith('2026-08-20'), isTrue);
    });
  });

  group('MyReview.fromJson', () {
    test('내 리뷰 API 응답과 상태 라벨을 파싱한다', () {
      final pending = MyReview.fromJson({
        'id': 'r2',
        'order_id': 'o1',
        'rating': 4,
        'content': '수선이 만족스러워요.',
        'photo_urls': [],
        'display_name': '이**',
        'repair_summary': '셔츠 · 소매기장',
        'points_type': 'text',
        'reviewed_at': '2026-08-18T09:00:00.000Z',
        'status': 'pending',
        'points_awarded': 200,
      });

      expect(pending.orderId, 'o1');
      expect(pending.pointsAwarded, 200);
      expect(pending.statusLabel, '검수 중 · 나만 보임');
      expect(pending.isPhoto, isFalse);

      expect(
        MyReview.fromJson({..._baseMine, 'status': 'approved'}).statusLabel,
        '공개',
      );
      expect(
        MyReview.fromJson({..._baseMine, 'status': 'hidden'}).statusLabel,
        '비공개 · 나만 보임',
      );
    });
  });

  group('withSampleReviews', () {
    test('공개 리뷰가 없으면 홈용 샘플을 쓴다', () {
      final empty = withSampleReviews(const []);
      expect(empty.reviews, previewReviews);
      expect(empty.count, previewCount);
      expect(empty.average, previewAverage);
    });

    test('공개 리뷰가 있으면 샘플로 바꾸지 않는다', () {
      final live = PublicReview.fromJson({
        'id': 'live',
        'rating': 4,
        'content': '실제 리뷰',
        'photo_urls': [],
        'display_name': '박**',
        'reviewed_at': '2026-08-21T00:00:00.000Z',
      });
      final result = withSampleReviews([live]);
      expect(result.reviews.single.id, 'live');
      expect(result.count, 1);
      expect(result.average, 4);
    });
  });

  group('formatPoints', () {
    test('적립 포인트 표기를 맞춘다', () {
      expect(formatPoints(200), '200P');
      expect(formatPoints(500), '500P');
      expect(formatPoints(1500), '1,500P');
    });
  });
}

const _baseMine = {
  'id': 'r3',
  'order_id': 'o2',
  'rating': 5,
  'content': '좋아요',
  'photo_urls': [],
  'display_name': '최**',
  'reviewed_at': '2026-08-18T09:00:00.000Z',
  'points_awarded': 0,
};
