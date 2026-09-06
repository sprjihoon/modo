import 'package:flutter/painting.dart';

/// object-contain 기준 탭 → 이미지 상대 좌표. 여백(레터박스) 탭은 null.
Offset? tapToImageRelative({
  required Offset localPosition,
  required Size imageSize,
  required Size containerSize,
  BoxFit fit = BoxFit.contain,
}) {
  if (imageSize.width <= 0 ||
      imageSize.height <= 0 ||
      containerSize.width <= 0 ||
      containerSize.height <= 0) {
    return null;
  }
  final sizes = applyBoxFit(fit, imageSize, containerSize);
  final dst = sizes.destination;
  if (dst.width <= 0 || dst.height <= 0) return null;
  final dx = (containerSize.width - dst.width) / 2;
  final dy = (containerSize.height - dst.height) / 2;
  final x = (localPosition.dx - dx) / dst.width;
  final y = (localPosition.dy - dy) / dst.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return Offset(x, y);
}

Offset clampImageRelative(Offset relative) {
  return Offset(
    relative.dx.clamp(0.0, 1.0),
    relative.dy.clamp(0.0, 1.0),
  );
}

Offset imageRelativeToLocal({
  required Offset relative,
  required Size imageSize,
  required Size containerSize,
  BoxFit fit = BoxFit.contain,
}) {
  final sizes = applyBoxFit(fit, imageSize, containerSize);
  final dst = sizes.destination;
  final dx = (containerSize.width - dst.width) / 2;
  final dy = (containerSize.height - dst.height) / 2;
  return Offset(
    dx + relative.dx.clamp(0.0, 1.0) * dst.width,
    dy + relative.dy.clamp(0.0, 1.0) * dst.height,
  );
}
