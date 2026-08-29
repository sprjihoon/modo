import 'package:flutter/material.dart';

import '../../domain/review_models.dart';
import 'star_rating.dart';

class ReviewCard extends StatelessWidget {
  const ReviewCard({
    super.key,
    required this.review,
    this.showStatus = false,
    this.compact = false,
  });

  final PublicReview review;
  final bool showStatus;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final status = review is MyReview ? (review as MyReview).status : null;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF3F4F6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      review.displayName,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF111827),
                      ),
                    ),
                    if (review.repairSummary != null && review.repairSummary!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          review.repairSummary!,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                        ),
                      ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  StarRating(value: review.rating, size: StarRatingSize.sm),
                  const SizedBox(height: 4),
                  Text(
                    formatReviewDate(review.reviewedAt),
                    style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                  ),
                ],
              ),
            ],
          ),
          if (showStatus && status != null) ...[
            const SizedBox(height: 8),
            _StatusBadge(status: status, label: (review as MyReview).statusLabel),
          ],
          const SizedBox(height: 12),
          Text(
            review.content,
            maxLines: compact ? 2 : null,
            overflow: compact ? TextOverflow.ellipsis : null,
            style: const TextStyle(
              fontSize: 14,
              height: 1.5,
              color: Color(0xFF374151),
            ),
          ),
          if (review.photoUrls.isNotEmpty) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 80,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: review.photoUrls.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final url = review.photoUrls[i];
                  return GestureDetector(
                    onTap: () => _openPhoto(context, url),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        url,
                        width: 80,
                        height: 80,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 80,
                          height: 80,
                          color: const Color(0xFFF3F4F6),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _openPhoto(BuildContext context, String url) {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black.withOpacity(0.8),
      builder: (context) {
        return GestureDetector(
          onTap: () => Navigator.of(context).pop(),
          child: Dialog(
            backgroundColor: Colors.transparent,
            insetPadding: const EdgeInsets.all(24),
            child: Image.network(url, fit: BoxFit.contain),
          ),
        );
      },
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status, required this.label});

  final String status;
  final String label;

  @override
  Widget build(BuildContext context) {
    final bg = status == 'approved'
        ? const Color(0x1A00C896)
        : status == 'hidden'
            ? const Color(0xFFF3F4F6)
            : const Color(0xFFFFFBEB);
    final fg = status == 'approved'
        ? const Color(0xFF00A07B)
        : status == 'hidden'
            ? const Color(0xFF6B7280)
            : const Color(0xFFB45309);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg),
      ),
    );
  }
}
