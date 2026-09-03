import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/widgets/modo_app_bar.dart';
import '../../../../services/promotion_rules.dart';
import '../../../../services/promotion_service.dart';

class CouponsPage extends StatefulWidget {
  const CouponsPage({super.key});

  @override
  State<CouponsPage> createState() => _CouponsPageState();
}

class _CouponsPageState extends State<CouponsPage> {
  final _service = PromotionService();
  List<Map<String, dynamic>> _coupons = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rows = await _service.getMyCoupons();
    if (!mounted) return;
    setState(() {
      _coupons = rows;
      _loading = false;
    });
  }

  CouponWalletStatus _status(Map<String, dynamic> row) {
    return classifyWalletCoupon(
      isActive: row['is_active'] as bool? ?? true,
      now: DateTime.now(),
      validUntil: row['valid_until'] != null
          ? DateTime.parse(row['valid_until'] as String)
          : null,
      usedCount: row['used_count'] as int? ?? 0,
      maxUses: row['max_uses'] as int? ?? 1,
    );
  }

  String _discountLabel(Map<String, dynamic> row) {
    final type = row['discount_type'] as String? ?? 'FIXED';
    final value = row['discount_value'] as int? ?? 0;
    final shipping = row['includes_free_shipping'] == true ? ' · 배송비 무료' : '';
    return type == 'PERCENTAGE'
        ? '$value% 할인$shipping'
        : '${formatPromotionPrice(value)}원 할인$shipping';
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        appBar: ModoAppBar(title: Text('쿠폰함')),
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF00C896)),
        ),
      );
    }

    final usable = _coupons.where((row) => _status(row) == CouponWalletStatus.usable).toList();
    final others = _coupons.where((row) => _status(row) != CouponWalletStatus.usable).toList();

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: const ModoAppBar(title: Text('쿠폰함')),
      body: RefreshIndicator(
        color: const Color(0xFF00C896),
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF00C896).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFF00C896).withValues(alpha: 0.2),
                ),
              ),
              child: const Text(
                '쿠폰은 앱에서 주문할 때 사용할 수 있어요. 웹 주문에는 적용되지 않습니다.',
                style: TextStyle(fontSize: 13, height: 1.4),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              '사용 가능 ${usable.length}장',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 12),
            if (usable.isEmpty)
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  '사용 가능한 전용 쿠폰이 없습니다',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey),
                ),
              )
            else
              ...usable.map(_card),
            if (others.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Text(
                '사용완료 · 만료',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 12),
              ...others.map(_card),
            ],
          ],
        ),
      ),
    );
  }

  Widget _card(Map<String, dynamic> row) {
    final status = _status(row);
    final code = row['code'] as String? ?? '';
    final dimmed = status != CouponWalletStatus.usable;
    String badge;
    switch (status) {
      case CouponWalletStatus.usable:
        badge = '사용가능';
      case CouponWalletStatus.used:
        badge = '사용완료';
      case CouponWalletStatus.expired:
        badge = '만료';
      case CouponWalletStatus.inactive:
        badge = '비활성';
    }

    return Opacity(
      opacity: dimmed ? 0.55 : 1,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: dimmed ? Colors.grey.shade200 : const Color(0xFF00C896),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  code,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const Spacer(),
                Text(
                  badge,
                  style: TextStyle(
                    fontSize: 12,
                    color: dimmed ? Colors.grey : const Color(0xFF00C896),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              _discountLabel(row),
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            if ((row['description'] as String?)?.isNotEmpty == true)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  row['description'] as String,
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
              ),
            if (status == CouponWalletStatus.usable)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: code));
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('$code 코드를 복사했습니다')),
                    );
                  },
                  child: const Text('코드 복사'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
