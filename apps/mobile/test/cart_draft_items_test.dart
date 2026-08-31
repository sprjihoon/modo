import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/orders/domain/cart_draft_items.dart';
import 'package:modu_repair/features/orders/domain/models/order_draft.dart';
import 'package:modu_repair/features/profile/domain/point_description.dart';

void main() {
  group('cartItemsFromDraft', () {
    test('expands new-flow items[] used by order draft toJson', () {
      const draft = OrderDraft(
        items: [
          ClothingItem(
            clothingType: '바지',
            repairItems: [
              RepairItem(name: '기장 줄임', price: 8000),
            ],
            imagesWithPins: [
              ImageWithPins(imageUrl: 'https://example.com/a.jpg'),
            ],
          ),
        ],
        pickupAddress: '서울 강남구',
      );

      final items = cartItemsFromDraft(
        draft.toJson(),
        idPrefix: 'local',
        serverId: 'srv-1',
      );

      expect(items, hasLength(1));
      expect(items.first.repairItem['name'], '기장 줄임');
      expect(items.first.repairItem['repairPart'], '기장 줄임');
      expect(items.first.clothingType, '바지');
      expect(items.first.serverId, 'srv-1');
      expect(items.first.imageUrls, ['https://example.com/a.jpg']);
    });

    test('expands two clothing groups into separate cart rows', () {
      final items = cartItemsFromDraft(
        {
          'items': [
            {
              'clothingType': '바지',
              'repairItems': [
                {'name': '기장 줄임', 'price': 8000},
              ],
            },
            {
              'clothingType': '셔츠',
              'repairItems': [
                {'name': '소매 줄임', 'price': 5000},
                {'name': '기장 줄임', 'price': 7000},
              ],
            },
          ],
        },
        idPrefix: 'multi',
      );

      expect(items, hasLength(3));
      expect(items.map((e) => e.clothingType).toList(), ['바지', '셔츠', '셔츠']);
      expect(items[1].repairItem['name'], '소매 줄임');
      expect(items[0].groupKey, isNot(items[1].groupKey));
    });

    test('empty items[] falls back to top-level repairItems', () {
      final items = cartItemsFromDraft(
        {
          'items': <dynamic>[],
          'clothingType': '코트',
          'repairItems': [
            {'name': '단추 수선', 'price': 3000},
          ],
        },
        idPrefix: 'fallback',
      );

      expect(items, hasLength(1));
      expect(items.first.clothingType, '코트');
      expect(items.first.repairItem['name'], '단추 수선');
    });

    test('still reads legacy top-level repairItems', () {
      final items = cartItemsFromDraft(
        {
          'clothingType': '셔츠',
          'repairItems': [
            {'name': '소매 줄임', 'price': 5000},
          ],
          'imageUrls': ['https://example.com/b.jpg'],
        },
        idPrefix: 'legacy',
      );

      expect(items, hasLength(1));
      expect(items.first.repairItem['repairPart'], '소매 줄임');
      expect(items.first.imageUrls, ['https://example.com/b.jpg']);
    });

    test('reads legacy single repairItem', () {
      final items = cartItemsFromDraft(
        {
          'clothingType': '원피스',
          'repairItem': {
            'repairPart': '기장 줄임',
            'price': '12,000원',
            'detail': '뒤 62cm',
          },
        },
        idPrefix: 'old',
      );

      expect(items, hasLength(1));
      expect(items.first.repairItem['name'], '기장 줄임');
      expect(items.first.repairItem['price'], 12000);
      expect(items.first.repairItem['detail'], '뒤 62cm');
    });

    test('empty draft returns no rows', () {
      expect(cartItemsFromDraft({}, idPrefix: 'empty'), isEmpty);
    });
  });

  group('OrderDraft customerMemo', () {
    test('keeps 수선 요청 메모 through json roundtrip', () {
      const draft = OrderDraft(
        items: [
          ClothingItem(
            clothingType: '바지',
            repairItems: [RepairItem(name: '기장 줄임', price: 8000)],
          ),
        ],
        notes: '현관 비번 1234',
        customerMemo: '안감 조심',
      );

      final restored = OrderDraft.fromJson(draft.toJson());
      expect(restored.customerMemo, '안감 조심');
      expect(restored.notes, '현관 비번 1234');
      expect(restored.toJson()['customerMemo'], '안감 조심');
    });
  });

  group('formatPointDescription', () {
    test('hides payment intent uuid', () {
      expect(
        formatPointDescription(
          '결제 포인트 사용 예약 (intent:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee)',
          isEarn: false,
        ),
        '포인트 사용',
      );
    });

    test('hides bare intent uuid without parens', () {
      expect(
        formatPointDescription(
          '결제 포인트 사용 예약 intent:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          isEarn: false,
        ),
        '포인트 사용',
      );
    });

    test('maps restore text', () {
      expect(
        formatPointDescription(
          '결제 포인트 예약 해제 (intent:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee)',
          isEarn: true,
        ),
        '포인트 사용 취소',
      );
    });

    test('keeps regular earn text', () {
      expect(
        formatPointDescription('주문 적립', isEarn: true),
        '주문 적립',
      );
      expect(
        formatPointDescription('친구 초대 적립', isEarn: true),
        '친구 초대 적립',
      );
    });

    test('empty and null fallbacks', () {
      expect(formatPointDescription('', isEarn: true), '포인트 적립');
      expect(formatPointDescription(null, isEarn: false), '포인트 사용');
    });
  });
}
