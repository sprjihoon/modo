import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/widgets/modo_app_bar.dart';
import '../../data/review_service.dart';
import '../../domain/review_models.dart';
import '../widgets/review_card.dart';

class ReviewsListPage extends StatefulWidget {
  const ReviewsListPage({super.key});

  @override
  State<ReviewsListPage> createState() => _ReviewsListPageState();
}

class _ReviewsListPageState extends State<ReviewsListPage> {
  final _service = ReviewService();
  List<PublicReview> _reviews = const [];
  List<MyReview> _mine = const [];
  String _sort = 'rating';
  bool _photoOnly = false;
  String _clothing = '';
  List<String> _categories = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final result = await _service.fetchReviews(
        sort: _sort,
        photoOnly: _photoOnly,
        clothing: _clothing,
        limit: 50,
      );
      if (!mounted) return;
      final mineIds = result.mine.map((r) => r.id).toSet();
      setState(() {
        _mine = result.mine;
        _reviews = result.reviews.where((r) => !mineIds.contains(r.id)).toList();
        _categories = result.categories;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _reviews = const [];
        _mine = const [];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: const ModoAppBar(title: Text('리뷰')),
      body: RefreshIndicator(
        color: kReviewBrand,
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 40),
          children: [
            if (_mine.isNotEmpty) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                child: Row(
                  children: [
                    const Expanded(
                      child: Text(
                        '내 리뷰',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF111827)),
                      ),
                    ),
                    GestureDetector(
                      onTap: () => context.push('/profile/reviews'),
                      child: const Text(
                        '수정·삭제',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: kReviewBrand),
                      ),
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: Text(
                  '홈이나 전체 공개와 상관없이 작성한 리뷰는 항상 볼 수 있습니다.',
                  style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                ),
              ),
              ..._mine.map(
                (review) => Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: ReviewCard(review: review, showStatus: true),
                ),
              ),
            ],
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
              child: Row(
                children: [
                  _Chip(
                    label: '별점순',
                    selected: _sort == 'rating',
                    onTap: () {
                      setState(() => _sort = 'rating');
                      _load();
                    },
                  ),
                  const SizedBox(width: 8),
                  _Chip(
                    label: '최신순',
                    selected: _sort == 'recent',
                    onTap: () {
                      setState(() => _sort = 'recent');
                      _load();
                    },
                  ),
                  const SizedBox(width: 8),
                  _Chip(
                    label: '포토리뷰',
                    selected: _photoOnly,
                    onTap: () {
                      setState(() => _photoOnly = !_photoOnly);
                      _load();
                    },
                  ),
                ],
              ),
            ),
            if (_categories.isNotEmpty) ...[
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Text(
                  '수선 종류',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF9CA3AF)),
                ),
              ),
              SizedBox(
                height: 34,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    _Chip(
                      label: '전체',
                      selected: _clothing.isEmpty,
                      onTap: () {
                        setState(() => _clothing = '');
                        _load();
                      },
                    ),
                    ..._categories.map(
                      (name) => Padding(
                        padding: const EdgeInsets.only(left: 8),
                        child: _Chip(
                          label: name,
                          selected: _clothing == name,
                          onTap: () {
                            setState(() => _clothing = name);
                            _load();
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            if (_loading)
              ...List.generate(
                3,
                (i) => Container(
                  height: 128,
                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              )
            else if (_reviews.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 64),
                child: Text(
                  _clothing.isNotEmpty && _photoOnly
                      ? '해당 수선 종류의 포토리뷰가 없습니다.'
                      : _clothing.isNotEmpty
                          ? '해당 수선 종류의 리뷰가 없습니다.'
                          : _photoOnly
                              ? '포토리뷰가 없습니다.'
                              : '아직 공개된 리뷰가 없습니다.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, color: Color(0xFF6B7280)),
                ),
              )
            else
              ..._reviews.map(
                (review) => Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: ReviewCard(review: review),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? kReviewBrand : const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : const Color(0xFF4B5563),
          ),
        ),
      ),
    );
  }
}
