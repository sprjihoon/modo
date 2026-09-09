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

  group('PendingReviewOrder.fromJson', () {
    test('작성 가능한 주문과 기본 이름을 파싱한다', () {
      expect(
        PendingReviewOrder.fromJson({'id': 'o9', 'item_name': '바지 · 기장수선'}).itemName,
        '바지 · 기장수선',
      );
      expect(
        PendingReviewOrder.fromJson({'id': 'o10'}).itemName,
        '수선',
      );
    });
  });

  group('마이페이지 내 리뷰', () {
    final written = MyReview.fromJson({
      ..._baseMine,
      'id': 'r1',
      'order_id': 'o1',
      'content': '기장이 딱 맞게 줄여졌어요.',
      'points_awarded': 200,
    });
    final pending = const PendingReviewOrder(id: 'o2', itemName: '셔츠 · 소매기장');

    test('빈 화면·작성·수정 상태를 구분한다', () {
      expect(resolveMyReviewsViewKind(loading: true), MyReviewsViewKind.loading);
      expect(resolveMyReviewsViewKind(error: '서버 오류'), MyReviewsViewKind.error);
      expect(resolveMyReviewsViewKind(), MyReviewsViewKind.empty);
      expect(
        resolveMyReviewsViewKind(pendingOrders: [pending]),
        MyReviewsViewKind.list,
      );
      expect(
        resolveMyReviewsViewKind(reviews: [written]),
        MyReviewsViewKind.list,
      );
    });

    test('작성하면 작성 목록에서 빠지고 내 리뷰에 생긴다', () {
      final after = applyWriteSuccess(
        MyReviewsPageData(
          reviews: const [],
          pendingOrders: [
            PendingReviewOrder(id: 'o1', itemName: '바지 · 기장수선'),
            pending,
          ],
        ),
        written,
      );
      expect(after.reviews.single.id, 'r1');
      expect(after.pendingOrders.map((o) => o.id), ['o2']);
    });

    test('삭제하면 다시 작성할 수 있다', () {
      final after = applyDeleteSuccess(
        MyReviewsPageData(reviews: [written], pendingOrders: [pending]),
        written,
        itemName: '바지 · 기장수선',
      );
      expect(after.reviews, isEmpty);
      expect(after.pendingOrders.map((o) => o.id), ['o1', 'o2']);
      expect(
        resolveMyReviewsViewKind(reviews: after.reviews, pendingOrders: after.pendingOrders),
        MyReviewsViewKind.list,
      );
    });
  });

  group('shouldAutoShowReviewInvite', () {
    test('한 번 닫으면 다시 열지 않는다', () {
      expect(
        shouldAutoShowReviewInvite(dismissed: false, pendingOrderId: 'o1'),
        isTrue,
      );
      expect(
        shouldAutoShowReviewInvite(dismissed: true, pendingOrderId: 'o1'),
        isFalse,
      );
      expect(
        shouldAutoShowReviewInvite(dismissed: false, pendingOrderId: null),
        isFalse,
      );
      expect(
        shouldAutoShowReviewInvite(dismissed: false, pendingOrderId: ''),
        isFalse,
      );
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
