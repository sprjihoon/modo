import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/widgets/modo_app_bar.dart';
import '../../data/review_service.dart';
import '../../domain/review_models.dart';
import '../widgets/review_card.dart';

class MyReviewsPage extends StatefulWidget {
  const MyReviewsPage({super.key});

  @override
  State<MyReviewsPage> createState() => _MyReviewsPageState();
}

class _MyReviewsPageState extends State<MyReviewsPage> {
  final _service = ReviewService();
  List<MyReview> _reviews = const [];
  bool _loading = true;
  String? _error;
  String? _busyId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final reviews = await _service.fetchMine();
      if (!mounted) return;
      setState(() {
        _reviews = reviews;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      final message = e.toString();
      setState(() {
        _error = message.contains('Unauthorized') || message.contains('로그인')
            ? '로그인 후 내 리뷰를 볼 수 있습니다.'
            : '리뷰를 불러오지 못했습니다.';
        _loading = false;
      });
    }
  }

  Future<void> _delete(MyReview review) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('리뷰 삭제'),
        content: const Text('이 리뷰를 삭제할까요? 삭제한 뒤에는 복구할 수 없습니다.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('취소')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('삭제', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _busyId = review.id);
    try {
      await _service.deleteReview(review.id);
      if (!mounted) return;
      setState(() {
        _reviews = _reviews.where((r) => r.id != review.id).toList();
        _busyId = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _busyId = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: const ModoAppBar(title: Text('내 리뷰')),
      body: _loading
          ? ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              children: List.generate(
                3,
                (i) => Container(
                  height: 112,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            )
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, style: const TextStyle(fontSize: 14, color: Color(0xFF6B7280))),
                        if (_error!.contains('로그인')) ...[
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: () => context.push('/login?from=${Uri.encodeComponent('/profile/reviews')}'),
                            child: const Text('로그인', style: TextStyle(color: kReviewBrand, fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ],
                    ),
                  ),
                )
              : _reviews.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text('아직 작성한 리뷰가 없습니다.', style: TextStyle(fontSize: 14, color: Color(0xFF6B7280))),
                            const SizedBox(height: 4),
                            const Text(
                              '배송이 완료된 주문에서 리뷰를 남길 수 있습니다.',
                              style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                            ),
                            const SizedBox(height: 16),
                            TextButton(
                              onPressed: () => context.push('/orders'),
                              child: const Text('주문 내역 보기', style: TextStyle(color: kReviewBrand, fontWeight: FontWeight.w600)),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
                      children: [
                        const Text(
                          '홈 노출이나 전체 공개 여부와 상관없이, 작성한 리뷰는 여기서 항상 볼 수 있습니다.',
                          style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                        ),
                        const SizedBox(height: 12),
                        ..._reviews.map((review) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Column(
                              children: [
                                ReviewCard(review: review, showStatus: true),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    GestureDetector(
                                      onTap: () => context.push('/orders/${review.orderId}'),
                                      child: const Text('주문 상세 보기', style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
                                    ),
                                    const Spacer(),
                                    GestureDetector(
                                      onTap: () async {
                                        await context.push('/profile/reviews/${review.id}/edit');
                                        if (mounted) _load();
                                      },
                                      child: const Text(
                                        '수정',
                                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: kReviewBrand),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    GestureDetector(
                                      onTap: _busyId == review.id ? null : () => _delete(review),
                                      child: Text(
                                        _busyId == review.id ? '삭제 중...' : '삭제',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.red.shade500,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        }),
                      ],
                    ),
    );
  }
}
