import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/widgets/modo_app_bar.dart';
import '../../../../services/customer_event_service.dart';
import '../../../../services/image_service.dart';
import '../../data/review_service.dart';
import '../../domain/review_models.dart';
import '../widgets/review_card.dart';
import '../widgets/star_rating.dart';

class ReviewWritePage extends StatefulWidget {
  const ReviewWritePage({
    super.key,
    this.orderId,
    this.reviewId,
  });

  final String? orderId;
  final String? reviewId;

  @override
  State<ReviewWritePage> createState() => _ReviewWritePageState();
}

class _ReviewWritePageState extends State<ReviewWritePage> {
  final _service = ReviewService();
  final _imageService = ImageService();
  final _contentController = TextEditingController();

  int _rating = 5;
  List<String> _photos = [];
  bool _uploading = false;
  bool _submitting = false;
  String? _error;
  String _itemName = '수선';
  MyReview? _existing;
  bool _canWrite = false;
  ReviewSettings _settings = const ReviewSettings();
  bool _loading = true;
  MyReview? _done;

  bool get _isEdit => widget.reviewId != null;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      if (_isEdit) {
        CustomerEventService.trackPageView(
          pageTitle: '리뷰 수정',
          pageUrl: '/profile/reviews/${widget.reviewId}/edit',
        );
        final data = await _service.fetchReview(widget.reviewId!);
        if (!mounted) return;
        setState(() {
          _existing = data.review;
          _rating = data.review.rating;
          _contentController.text = data.review.content;
          _photos = List.of(data.review.photoUrls);
          _itemName = data.itemName.isNotEmpty ? data.itemName : (data.review.repairSummary ?? '수선');
          _settings = data.settings;
          _canWrite = true;
          _loading = false;
        });
        return;
      }

      final orderId = widget.orderId;
      if (orderId == null || orderId.isEmpty) {
        setState(() {
          _error = '주문을 찾을 수 없습니다.';
          _loading = false;
        });
        return;
      }
      CustomerEventService.trackPageView(pageTitle: '리뷰 작성', pageUrl: '/orders/$orderId/review');
      final info = await _service.fetchOrderReview(orderId);
      if (!mounted) return;
      setState(() {
        _canWrite = info.canWrite;
        _existing = info.review;
        _itemName = info.itemName;
        _settings = info.settings;
        _loading = false;
      });
      if (info.canWrite) {
        CustomerEventService.trackEvent(
          eventType: CustomerEventType.REVIEW_START,
          targetId: orderId,
          targetType: 'order',
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _pickPhotos() async {
    final remain = kReviewPhotoMax - _photos.length;
    if (remain <= 0) return;
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      setState(() => _error = '로그인이 필요합니다.');
      return;
    }
    setState(() {
      _uploading = true;
      _error = null;
    });
    try {
      final files = await _imageService.pickMultipleImages(maxImages: remain);
      if (files.isEmpty) {
        setState(() => _uploading = false);
        return;
      }
      final urls = await _imageService.uploadMultipleImages(
        xFiles: files,
        bucket: 'review-images',
        folder: user.id,
      );
      if (!mounted) return;
      setState(() {
        _photos = [..._photos, ...urls].take(kReviewPhotoMax).toList();
        _uploading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = '사진 업로드에 실패했습니다.';
        _uploading = false;
      });
    }
  }

  Future<void> _submit() async {
    if (_rating < kStarMin) {
      setState(() => _error = '별점을 선택해 주세요.');
      return;
    }
    final content = _contentController.text.trim();
    if (content.length < _settings.minContentLength) {
      setState(() => _error = '리뷰는 ${_settings.minContentLength}자 이상 작성해 주세요.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final review = _isEdit
          ? await _service.updateReview(
              reviewId: widget.reviewId!,
              rating: _rating,
              content: content,
              photoUrls: _photos,
            )
          : await _service.createReview(
              orderId: widget.orderId!,
              rating: _rating,
              content: content,
              photoUrls: _photos,
            );
      if (!_isEdit && widget.orderId != null) {
        CustomerEventService.trackEvent(
          eventType: CustomerEventType.REVIEW_SUBMIT,
          targetId: widget.orderId,
          targetType: 'order',
          metadata: {'rating': _rating, 'has_photo': _photos.isNotEmpty},
        );
      }
      if (!mounted) return;
      setState(() {
        _done = review;
        _canWrite = false;
        _submitting = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: ModoAppBar(title: Text(_isEdit ? '리뷰 수정' : '리뷰 작성')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: kReviewBrand))
          : SingleChildScrollView(
              child: _buildBody(),
            ),
    );
  }

  Widget _buildBody() {
    final shown = _done ?? (_isEdit ? null : _existing);
    if (shown != null) {
      final points = shown.pointsAwarded;
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
        child: Column(
          children: [
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0x0D00C896),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _done != null
                        ? (_isEdit ? '리뷰가 수정되었습니다' : '리뷰가 등록되었습니다')
                        : '이미 작성한 리뷰입니다',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF111827)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _done != null && _isEdit
                        ? '수정한 내용은 검수 후 다시 공개됩니다.'
                        : shown.status == 'approved'
                            ? '다른 고객에게 공개된 리뷰입니다.'
                            : shown.status == 'hidden'
                                ? '현재 비공개입니다. 작성하신 내용은 계속 볼 수 있습니다.'
                                : '검수 후 다른 고객에게 보여집니다.',
                    style: const TextStyle(fontSize: 14, height: 1.5, color: Color(0xFF6B7280)),
                  ),
                  if (_done != null && points > 0) ...[
                    const SizedBox(height: 8),
                    Text(
                      '${formatPoints(points)}가 적립되었습니다',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: kReviewBrand),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            ReviewCard(review: shown, showStatus: true),
            if (_existing != null && _done == null) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => context.push('/profile/reviews'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: const BorderSide(color: Color(0xFFE5E7EB)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: const Text('내 리뷰에서 수정·삭제', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF374151))),
                ),
              ),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => context.go(_isEdit ? '/profile/reviews' : '/reviews'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: kReviewBrand,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: Text(_isEdit ? '내 리뷰로' : '전체 리뷰 보기', style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      );
    }

    if (!_canWrite) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 64),
        child: Text(
          _error ?? '이 주문은 리뷰를 작성할 수 없습니다.',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 14, color: Color(0xFF6B7280)),
        ),
      );
    }

    final emptySlots = (kReviewPhotoMax - _photos.length).clamp(1, 3);
    final placeholder = _settings.isActive
        ? '리뷰를 남겨 주시면 글 ${_settings.textReviewPoints}P, 사진 포함 시 ${_settings.photoReviewPoints}P가 적립됩니다.'
        : '수선 결과를 알려 주세요.';

    return Column(
      children: [
        Container(
          width: double.infinity,
          color: const Color(0xFFF4FBF8),
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
          child: Column(
            children: [
              Container(
                width: 96,
                height: 96,
                decoration: const BoxDecoration(
                  color: Color(0x2600C896),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.content_cut, size: 40, color: kReviewBrand),
              ),
              const SizedBox(height: 16),
              Text(
                _itemName,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF111827)),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 28, 20, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Center(
                child: Text(
                  '수선을 평가해 주세요!',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: StarRating(
                  value: _rating,
                  onChanged: (v) => setState(() => _rating = v),
                  size: StarRatingSize.xl,
                  color: StarRatingColor.brand,
                ),
              ),
              const SizedBox(height: 28),
              const Text('사진 첨부', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
              const SizedBox(height: 12),
              SizedBox(
                height: 88,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    ..._photos.map((url) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 10),
                        child: Stack(
                          clipBehavior: Clip.none,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: Image.network(url, width: 88, height: 88, fit: BoxFit.cover),
                            ),
                            Positioned(
                              top: -6,
                              right: -6,
                              child: GestureDetector(
                                onTap: () {
                                  final wasSaved = _existing?.photoUrls.contains(url) ?? false;
                                  if (!wasSaved) {
                                    _imageService.deleteImage(url: url, bucket: 'review-images');
                                  }
                                  setState(() => _photos = _photos.where((p) => p != url).toList());
                                },
                                child: Container(
                                  width: 24,
                                  height: 24,
                                  decoration: const BoxDecoration(color: kReviewBrand, shape: BoxShape.circle),
                                  child: const Icon(Icons.close, size: 14, color: Colors.white),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                    if (_photos.length < kReviewPhotoMax)
                      ...List.generate(emptySlots, (_) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 10),
                          child: GestureDetector(
                            onTap: _uploading ? null : _pickPhotos,
                            child: Container(
                              width: 88,
                              height: 88,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: const Color(0xFFE5E7EB)),
                              ),
                              child: _uploading
                                  ? const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: kReviewBrand)))
                                  : const Icon(Icons.add, size: 28, color: Color(0xFFD1D5DB)),
                            ),
                          ),
                        );
                      }),
                  ],
                ),
              ),
              const SizedBox(height: 28),
              const Text('리뷰 작성', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
              const SizedBox(height: 12),
              TextField(
                controller: _contentController,
                maxLines: 6,
                maxLength: 1000,
                decoration: InputDecoration(
                  hintText: placeholder,
                  hintStyle: const TextStyle(fontSize: 14, color: Color(0xFF9CA3AF)),
                  counterText: '',
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.all(16),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: kReviewBrand),
                  ),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(fontSize: 14, color: Color(0xFFEF4444))),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submitting || _uploading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kReviewBrand,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: kReviewBrand.withOpacity(0.5),
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    _submitting
                        ? (_isEdit ? '수정 중...' : '등록 중...')
                        : (_isEdit ? '리뷰 수정' : '리뷰 등록'),
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _isEdit ? '수정 후 다시 검수를 거쳐 다른 고객에게 보여집니다' : '등록 후 검수를 거쳐 다른 고객에게 보여집니다',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
