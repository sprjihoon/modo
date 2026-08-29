import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../data/review_service.dart';
import '../../domain/review_models.dart';
import 'star_rating.dart';

class HomeReviewsPreview extends StatefulWidget {
  const HomeReviewsPreview({super.key});

  @override
  State<HomeReviewsPreview> createState() => _HomeReviewsPreviewState();
}

class _HomeReviewsPreviewState extends State<HomeReviewsPreview> {
  final _service = ReviewService();
  List<PublicReview> _reviews = const [];
  double _average = 0;
  int _count = 0;
  bool _ready = false;
  int _photoOffset = 0;
  int _textOffset = 0;
  bool _fading = false;
  Timer? _rotateTimer;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _rotateTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final result = await _service.fetchReviews(home: true, limit: 20);
      if (!mounted) return;
      setState(() {
        _reviews = result.reviews;
        _average = result.average;
        _count = result.count;
        _ready = true;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _reviews = const [];
        _average = 0;
        _count = 0;
        _ready = true;
      });
    }
    _startRotate();
  }

  void _startRotate() {
    _rotateTimer?.cancel();
    final photos = _reviews.where((r) => r.isPhoto).toList();
    final texts = _reviews.where((r) => !r.isPhoto).toList();
    final textVisible = photos.isEmpty ? 4 : 2;
    final rotatePhotos = photos.length > 2;
    final rotateTexts = texts.length > textVisible;
    if (!rotatePhotos && !rotateTexts) return;
    _rotateTimer = Timer.periodic(const Duration(milliseconds: 4500), (_) {
      if (!mounted) return;
      setState(() => _fading = true);
      Future.delayed(const Duration(milliseconds: 280), () {
        if (!mounted) return;
        setState(() {
          if (rotatePhotos) _photoOffset = (_photoOffset + 1) % photos.length;
          if (rotateTexts) _textOffset = (_textOffset + 1) % texts.length;
          _fading = false;
        });
      });
    });
  }

  List<PublicReview> _window(List<PublicReview> list, int offset, int count) {
    if (list.length <= count) return list;
    return List.generate(count, (i) => list[(offset + i) % list.length]);
  }

  @override
  Widget build(BuildContext context) {
    final photos = _reviews.where((r) => r.isPhoto).toList();
    final texts = _reviews.where((r) => !r.isPhoto).toList();
    final textVisibleCount = photos.isEmpty ? 4 : 2;
    final visiblePhotos = _window(photos, _photoOffset, 2);
    final visibleTexts = _window(texts, _textOffset, textVisibleCount);

    return ColoredBox(
      color: const Color(0xFFF7F8F8),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(0, 24, 0, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '고객 리뷰',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF111827),
                          ),
                        ),
                        if (_ready && _count > 0) ...[
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              StarRating(value: _average.round(), size: StarRatingSize.sm),
                              const SizedBox(width: 6),
                              Text(
                                _average.toStringAsFixed(1),
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF1F2937),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '($_count개)',
                                style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: () => context.push('/reviews'),
                    child: const Row(
                      children: [
                        Text('전체보기', style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
                        Icon(Icons.chevron_right, size: 16, color: Color(0xFF9CA3AF)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            AnimatedOpacity(
              duration: const Duration(milliseconds: 280),
              opacity: _fading ? 0 : 1,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: !_ready
                    ? _skeleton()
                    : _reviews.isEmpty
                        ? Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Text(
                              '아직 공개된 리뷰가 없습니다',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 14, color: Color(0xFF6B7280)),
                            ),
                          )
                        : Column(
                            children: [
                              if (visiblePhotos.isNotEmpty)
                                Row(
                                  children: [
                                    for (var i = 0; i < visiblePhotos.length; i++) ...[
                                      if (i > 0) const SizedBox(width: 10),
                                      Expanded(child: _PhotoTile(review: visiblePhotos[i])),
                                    ],
                                  ],
                                ),
                              if (visiblePhotos.isNotEmpty && visibleTexts.isNotEmpty)
                                const SizedBox(height: 10),
                              if (visibleTexts.isNotEmpty)
                                Wrap(
                                  spacing: 10,
                                  runSpacing: 10,
                                  children: visibleTexts
                                      .map((review) => SizedBox(
                                            width: (MediaQuery.of(context).size.width - 16 * 2 - 10) / 2,
                                            child: _TextTile(review: review),
                                          ))
                                      .toList(),
                                ),
                            ],
                          ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _skeleton() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _box(aspect: 4 / 3)),
            const SizedBox(width: 10),
            Expanded(child: _box(aspect: 4 / 3)),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(child: _box(height: 92)),
            const SizedBox(width: 10),
            Expanded(child: _box(height: 92)),
          ],
        ),
      ],
    );
  }

  Widget _box({double? aspect, double? height}) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: aspect != null ? AspectRatio(aspectRatio: aspect, child: const SizedBox()) : null,
    );
  }
}

class _PhotoTile extends StatelessWidget {
  const _PhotoTile({required this.review});
  final PublicReview review;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF3F4F6)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 4 / 3,
            child: Image.network(
              review.photoUrls.first,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => const ColoredBox(color: Color(0xFFF3F4F6)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                StarRating(value: review.rating, size: StarRatingSize.sm),
                const SizedBox(height: 4),
                Text(
                  review.displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  review.content,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11, height: 1.35, color: Color(0xFF6B7280)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TextTile extends StatelessWidget {
  const _TextTile({required this.review});
  final PublicReview review;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 92,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF3F4F6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  review.displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF111827),
                  ),
                ),
              ),
              StarRating(value: review.rating, size: StarRatingSize.sm),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            review.content,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11, height: 1.35, color: Color(0xFF6B7280)),
          ),
        ],
      ),
    );
  }
}
