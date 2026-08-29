import 'package:flutter/material.dart';

import '../../domain/review_models.dart';

enum StarRatingSize { sm, md, lg, xl }

enum StarRatingColor { gold, brand }

class StarRating extends StatelessWidget {
  const StarRating({
    super.key,
    required this.value,
    this.onChanged,
    this.size = StarRatingSize.md,
    this.color = StarRatingColor.gold,
  });

  final int value;
  final ValueChanged<int>? onChanged;
  final StarRatingSize size;
  final StarRatingColor color;

  double get _iconSize => switch (size) {
        StarRatingSize.sm => 14,
        StarRatingSize.md => 20,
        StarRatingSize.lg => 32,
        StarRatingSize.xl => 40,
      };

  @override
  Widget build(BuildContext context) {
    final fill = color == StarRatingColor.brand ? kReviewBrand : kReviewStarGold;
    final gap = size == StarRatingSize.xl ? 8.0 : 2.0;
    final stars = List<Widget>.generate(kStarMax, (i) {
      final star = i + kStarMin;
      final filled = star <= value;
      final icon = Icon(
        Icons.star_rounded,
        size: _iconSize,
        color: filled ? fill : const Color(0xFFF3F4F6),
      );
      if (onChanged == null) return icon;
      return GestureDetector(
        onTap: () => onChanged!(star),
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: const EdgeInsets.all(2),
          child: icon,
        ),
      );
    });

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < stars.length; i++) ...[
          if (i > 0) SizedBox(width: gap),
          stars[i],
        ],
      ],
    );
  }
}
