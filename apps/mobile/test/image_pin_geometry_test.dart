import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/orders/domain/image_pin_geometry.dart';

void main() {
  const image = Size(400, 800);
  const container = Size(400, 300);

  test('center tap on contained portrait maps to image center', () {
    final rel = tapToImageRelative(
      localPosition: const Offset(200, 150),
      imageSize: image,
      containerSize: container,
    );
    expect(rel, isNotNull);
    expect(rel!.dx, closeTo(0.5, 0.001));
    expect(rel.dy, closeTo(0.5, 0.001));
  });

  test('letterbox tap is ignored', () {
    final rel = tapToImageRelative(
      localPosition: const Offset(20, 150),
      imageSize: image,
      containerSize: container,
    );
    expect(rel, isNull);
  });

  test('image-relative pin sits on the photo, not the pad', () {
    final local = imageRelativeToLocal(
      relative: Offset.zero,
      imageSize: image,
      containerSize: container,
    );
    expect(local.dx, closeTo(125, 0.001));
    expect(local.dy, closeTo(0, 0.001));
  });
}
