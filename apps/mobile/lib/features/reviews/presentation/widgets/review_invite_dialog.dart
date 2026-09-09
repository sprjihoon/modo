import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/review_service.dart';
import '../../domain/review_models.dart';
import '../pages/review_write_page.dart';

const _dismissKey = kReviewInviteDismissKey;
const _brand = Color(0xFF00C896);

class ReviewInviteDialog {
  ReviewInviteDialog._();

  /// 홈에서 한 번만 표시. 닫으면 다시 열리지 않는다.
  static Future<void> maybeShow(BuildContext context) async {
    if (!context.mounted) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      if (prefs.getBool(_dismissKey) == true) return;

      final pending = await ReviewService().fetchPending();
      if (!shouldAutoShowReviewInvite(dismissed: false, pendingOrderId: pending?.id) ||
          !context.mounted) {
        return;
      }

      await showDialog<void>(
        context: context,
        barrierDismissible: true,
        builder: (dialogContext) => _InviteDialog(
          order: pending,
          onDismiss: () {
            if (dialogContext.mounted) {
              Navigator.of(dialogContext).pop();
            }
          },
        ),
      );
      await prefs.setBool(_dismissKey, true);
    } catch (e) {
      debugPrint('리뷰 초대 팝업 로드 실패(무시): $e');
    }
  }
}

class _InviteDialog extends StatefulWidget {
  const _InviteDialog({
    required this.order,
    required this.onDismiss,
  });

  final PendingReviewOrder order;
  final VoidCallback onDismiss;

  @override
  State<_InviteDialog> createState() => _InviteDialogState();
}

class _InviteDialogState extends State<_InviteDialog> {
  bool _writing = false;

  @override
  Widget build(BuildContext context) {
    final maxHeight = MediaQuery.of(context).size.height * 0.85;

    return Dialog(
      insetPadding: EdgeInsets.fromLTRB(20, 24, 20, 24 + MediaQuery.of(context).viewInsets.bottom),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxHeight, maxWidth: 360),
        child: Stack(
          children: [
            _writing
                ? SingleChildScrollView(
                    padding: const EdgeInsets.only(top: 40, bottom: 8),
                    child: ReviewWritePage(
                      orderId: widget.order.id,
                      embedded: true,
                      onClose: () => widget.onDismiss(),
                    ),
                  )
                : Padding(
                    padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: const BoxDecoration(
                            color: Color(0x1F00C896),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.card_giftcard_rounded, color: _brand, size: 28),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          '배송이 완료되었습니다',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _brand,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          '리뷰를 작성해 주시면\n포인트가 지급됩니다',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            height: 1.35,
                            color: Color(0xFF111827),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          widget.order.itemName,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 14, color: Color(0xFF6B7280)),
                        ),
                        const SizedBox(height: 16),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF9FAFB),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Column(
                            children: [
                              Text(
                                '글 리뷰 200P · 사진 포함 시 500P',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF111827),
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                '닫으면 다시 표시되지 않습니다. 이후에는 마이페이지 → 내 리뷰에서 작성할 수 있습니다.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 12, height: 1.4, color: Color(0xFF6B7280)),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () => widget.onDismiss(),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFF4B5563),
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  side: const BorderSide(color: Color(0xFFE5E7EB)),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                ),
                                child: const Text('닫기', style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () => setState(() => _writing = true),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: _brand,
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                ),
                                child: const Text('작성하기', style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
            Positioned(
              top: 8,
              right: 8,
              child: IconButton(
                onPressed: () => widget.onDismiss(),
                icon: const Icon(Icons.close, color: Color(0xFF9CA3AF)),
                tooltip: '닫기',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
