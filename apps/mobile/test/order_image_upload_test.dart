import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/orders/domain/models/order_draft.dart';
import 'package:modu_repair/features/orders/domain/order_image_upload.dart';

void main() {
  group('planOrderImageUpload', () {
    test('allows up to 5 photos', () {
      expect(kMaxOrderImages, 5);
      expect(kMaxPinsPerImage, 5);
      final first = planOrderImageUpload(pickedCount: 2, currentCount: 0);
      expect(first.acceptedCount, 2);
      expect(first.rejectedExtra, 0);
    });

    test('counts reserved slots', () {
      final plan = planOrderImageUpload(
        pickedCount: 3,
        currentCount: 3,
        reservedCount: 1,
      );
      expect(plan.remainingSlots, 1);
      expect(plan.acceptedCount, 1);
      expect(plan.rejectedExtra, 2);
    });

    test('rejects when full', () {
      final plan = planOrderImageUpload(pickedCount: 2, currentCount: 5);
      expect(plan.acceptedCount, 0);
      expect(plan.remainingSlots, 0);
      expect(plan.rejectedExtra, 2);
    });
  });

  group('ImageWithPins', () {
    test('keeps per-photo pins and coordSpace', () {
      const image = ImageWithPins(
        imageUrl: 'https://example.com/a.jpg',
        coordSpace: 'image',
        pins: [
          PinData(id: 'p1', relativeX: 0.2, relativeY: 0.8, memo: '밑단'),
        ],
      );
      final restored = ImageWithPins.fromJson(image.toJson());
      expect(restored.coordSpace, 'image');
      expect(restored.pins.single.memo, '밑단');
      expect(restored.pins.single.relativeX, 0.2);
    });

    test('reads imagePath fallback', () {
      final restored = ImageWithPins.fromJson({
        'imagePath': 'https://example.com/b.jpg',
        'pins': [
          {'id': 'p2', 'relative_x': 0.5, 'relative_y': 0.4, 'memo': '소매'},
        ],
      });
      expect(restored.imageUrl, 'https://example.com/b.jpg');
      expect(restored.pins.single.memo, '소매');
    });
  });
}
