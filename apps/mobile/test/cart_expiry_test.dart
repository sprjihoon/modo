import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/orders/domain/cart_draft_items.dart';
import 'package:modu_repair/features/orders/domain/cart_expiry.dart';

void main() {
  final now = DateTime.utc(2026, 9, 4);

  test('5일 미만 장바구니는 유지한다', () {
    expect(isCartExpired(DateTime.utc(2026, 9, 3), now), isFalse);
    expect(isCartExpired(DateTime.utc(2026, 8, 30, 0, 0, 1), now), isFalse);
  });

  test('담은 지 5일이 되면 만료한다', () {
    expect(isCartExpired(DateTime.utc(2026, 8, 30), now), isTrue);
    expect(isCartExpired(DateTime.utc(2026, 8, 20), now), isTrue);
  });

  test('서버 created_at을 장바구니 addedAt으로 가져온다', () {
    final items = cartItemsFromDraft(
      {
        'repairItems': [
          {'name': '기장 줄임', 'price': 8000},
        ],
      },
      idPrefix: 'srv',
      serverId: 'srv',
      addedAt: DateTime.utc(2026, 8, 20),
    );
    expect(items, hasLength(1));
    expect(items.first.addedAt, DateTime.utc(2026, 8, 20));
    expect(isCartExpired(items.first.addedAt, now), isTrue);
  });
}
