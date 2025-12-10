import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../../core/enums/extra_charge_status.dart';
import '../../providers/extra_charge_provider.dart';
import '../../domain/models/extra_charge_data.dart';

/// 추가 결제 요청 카드 (고객용)
/// 
/// PENDING_CUSTOMER 상태일 때 최상단에 표시
/// 3가지 액션: 결제하기, 그냥 진행, 반송하기
class ExtraChargeRequestCard extends StatelessWidget {
  final String orderId;
  final Map<String, dynamic> orderData;
  final VoidCallback? onActionCompleted;

  const ExtraChargeRequestCard({
    Key? key,
    required this.orderId,
    required this.orderData,
    this.onActionCompleted,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final extraChargeProvider = context.watch<ExtraChargeProvider>();
    final status = extraChargeProvider.parseExtraChargeStatus(orderData);
    final data = extraChargeProvider.parseExtraChargeData(orderData);

    // PENDING_CUSTOMER 상태가 아니면 표시하지 않음
    if (status != ExtraChargeStatus.PENDING_CUSTOMER) {
      return const SizedBox.shrink();
    }

    final price = data.managerPrice ?? 0;
    final note = data.managerNote ?? '추가 작업이 필요합니다';
    final memo = data.workerMemo ?? '';

    return Card(
      margin: const EdgeInsets.all(16),
      elevation: 4,
      color: Colors.orange[50],
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.orange[300]!, width: 2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 헤더
            Row(
              children: [
                Icon(
                  Icons.warning_amber_rounded,
                  color: Colors.orange[700],
                  size: 28,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '추가 결제 요청',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.orange[900],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 안내 문구
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                note,
                style: const TextStyle(fontSize: 14),
              ),
            ),
            const SizedBox(height: 12),

            // 추가 금액
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    '추가 청구 금액',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    '${NumberFormat('#,###').format(price)}원',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.orange[900],
                    ),
                  ),
                ],
              ),
            ),

            // 현장 메모 (있으면 표시)
            if (memo.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                '현장 메모: $memo',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[700],
                ),
              ),
            ],

            const SizedBox(height: 16),

            // 액션 버튼들
            Column(
              children: [
                // 결제하기 버튼
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _handlePay(context, price),
                    icon: const Icon(Icons.payment),
                    label: const Text('결제하기'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                // 그냥 진행 / 반송하기 버튼
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _handleSkip(context),
                        icon: const Icon(Icons.arrow_forward),
                        label: const Text('그냥 진행'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.green,
                          side: const BorderSide(color: Colors.green),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _handleReturn(context),
                        icon: const Icon(Icons.keyboard_return),
                        label: const Text('반송하기'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 12),

            // 안내 메시지
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 16,
                    color: Colors.grey[600],
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '• 그냥 진행: 추가 작업 없이 원안대로 진행합니다\n• 반송: 왕복 배송비 6,000원이 차감됩니다',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey[700],
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
  }

  /// 결제하기
  Future<void> _handlePay(BuildContext context, int price) async {
    // 결제 확인 다이얼로그
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('추가 결제'),
        content: Text('${NumberFormat('#,###').format(price)}원을 결제하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
            ),
            child: const Text('결제'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    // 로딩 표시
    if (!context.mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      final extraChargeProvider = context.read<ExtraChargeProvider>();
      final success = await extraChargeProvider.processCustomerDecision(
        orderId: orderId,
        action: CustomerDecisionAction.PAY,
      );

      if (!context.mounted) return;
      Navigator.of(context).pop(); // 로딩 닫기

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('추가 결제 완료! 작업을 재개합니다'),
            backgroundColor: Colors.green,
          ),
        );
        onActionCompleted?.call();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(extraChargeProvider.errorMessage ?? '결제 실패'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!context.mounted) return;
      Navigator.of(context).pop(); // 로딩 닫기
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('오류 발생: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// 그냥 진행
  Future<void> _handleSkip(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('원안대로 진행'),
        content: const Text('추가 작업 없이 원안대로 진행하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
            child: const Text('진행'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    if (!context.mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      final extraChargeProvider = context.read<ExtraChargeProvider>();
      final success = await extraChargeProvider.processCustomerDecision(
        orderId: orderId,
        action: CustomerDecisionAction.SKIP,
      );

      if (!context.mounted) return;
      Navigator.of(context).pop(); // 로딩 닫기

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('원안대로 진행합니다'),
            backgroundColor: Colors.green,
          ),
        );
        onActionCompleted?.call();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(extraChargeProvider.errorMessage ?? '처리 실패'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!context.mounted) return;
      Navigator.of(context).pop(); // 로딩 닫기
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('오류 발생: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// 반송하기
  Future<void> _handleReturn(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('반송 요청'),
        content: const Text(
          '반송을 요청하시겠습니까?\n\n'
          '⚠️ 왕복 배송비 6,000원이 차감됩니다.\n'
          '이 금액은 환불 시 공제됩니다.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('반송 요청'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    if (!context.mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      final extraChargeProvider = context.read<ExtraChargeProvider>();
      final success = await extraChargeProvider.processCustomerDecision(
        orderId: orderId,
        action: CustomerDecisionAction.RETURN,
      );

      if (!context.mounted) return;
      Navigator.of(context).pop(); // 로딩 닫기

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('반송 요청 완료. 배송비 6,000원이 차감됩니다'),
            backgroundColor: Colors.orange,
          ),
        );
        onActionCompleted?.call();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(extraChargeProvider.errorMessage ?? '반송 요청 실패'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!context.mounted) return;
      Navigator.of(context).pop(); // 로딩 닫기
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('오류 발생: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}

