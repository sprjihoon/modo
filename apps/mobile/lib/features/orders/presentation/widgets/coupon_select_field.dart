import 'package:flutter/material.dart';

import '../../../../services/promotion_rules.dart';

const _brand = Color(0xFF00C896);

class CouponSelectField extends StatelessWidget {
  final List<Map<String, dynamic>> coupons;
  final String? selectedCode;
  final bool loading;
  final bool enabled;
  final VoidCallback? onTap;

  const CouponSelectField({
    super.key,
    required this.coupons,
    this.selectedCode,
    this.loading = false,
    this.enabled = true,
    this.onTap,
  });

  String get _displayText {
    if (loading) return '쿠폰을 불러오는 중...';
    if (coupons.isEmpty) return '사용 가능한 쿠폰이 없습니다';
    if (selectedCode == null || selectedCode!.isEmpty) {
      return '쿠폰을 선택하세요';
    }
    Map<String, dynamic>? match;
    for (final row in coupons) {
      if (row['code'] == selectedCode) {
        match = row;
        break;
      }
    }
    if (match == null) return selectedCode!;
    return couponWalletOptionLabel(
      code: match['code'] as String? ?? selectedCode!,
      discountType: match['discount_type'] as String? ?? 'FIXED',
      discountValue: match['discount_value'] as int? ?? 0,
    );
  }

  @override
  Widget build(BuildContext context) {
    final canOpen = enabled && !loading && coupons.isNotEmpty;
    final selected = selectedCode != null && selectedCode!.isNotEmpty;

    return InkWell(
      onTap: canOpen ? onTap : null,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? _brand : Colors.grey.shade200,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              Icons.local_offer_outlined,
              size: 20,
              color: selected ? _brand : Colors.grey.shade500,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                _displayText,
                style: TextStyle(
                  fontSize: 15,
                  color: selected
                      ? Colors.black87
                      : canOpen
                          ? Colors.grey.shade600
                          : Colors.grey.shade400,
                ),
              ),
            ),
            if (loading)
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: _brand,
                ),
              )
            else
              Icon(
                Icons.keyboard_arrow_down,
                color: canOpen ? Colors.grey.shade500 : Colors.grey.shade300,
              ),
          ],
        ),
      ),
    );
  }
}

Future<String?> showCouponSelectSheet({
  required BuildContext context,
  required List<Map<String, dynamic>> coupons,
  String? selectedCode,
}) {
  return showModalBottomSheet<String>(
    context: context,
    backgroundColor: Colors.white,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                '쿠폰 선택',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                '보유한 전용 쿠폰에서 골라 적용할 수 있습니다.',
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 12),
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.sizeOf(ctx).height * 0.45,
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: coupons.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final row = coupons[index];
                    final code = row['code'] as String? ?? '';
                    final selected = code == selectedCode;
                    final label = couponWalletOptionLabel(
                      code: code,
                      discountType: row['discount_type'] as String? ?? 'FIXED',
                      discountValue: row['discount_value'] as int? ?? 0,
                    );
                    final description = row['description'] as String?;
                    return InkWell(
                      onTap: () => Navigator.of(ctx).pop(code),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          color: selected
                              ? _brand.withValues(alpha: 0.08)
                              : Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: selected ? _brand : Colors.grey.shade200,
                            width: selected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              selected
                                  ? Icons.radio_button_checked
                                  : Icons.radio_button_off,
                              size: 22,
                              color: selected ? _brand : Colors.grey.shade400,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    label,
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: selected
                                          ? _brand
                                          : Colors.black87,
                                    ),
                                  ),
                                  if (description != null &&
                                      description.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(
                                        description,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}
