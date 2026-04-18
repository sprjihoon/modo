import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

/// 홈 화면에 표시할 추가결제 알림 배너
/// 
/// PENDING_CUSTOMER 상태인 주문이 있을 때 홈 화면 최상단에 표시
class ExtraChargeAlertBanner extends StatelessWidget {
  final Map<String, dynamic> orderData;

  const ExtraChargeAlertBanner({
    Key? key,
    required this.orderData,
  }) : super(key: key);

  void _navigateToPayment(BuildContext context) {
    // extra_charge_data에서 가격 정보 추출
    final extraChargeData = orderData['extra_charge_data'] as Map<String, dynamic>?;
    final price = extraChargeData?['managerPrice'] as int? ?? 0;
    final orderId = orderData['id'] as String;
    final orderNumber = orderData['order_number'] as String? ?? '주문';
    final note = extraChargeData?['managerNote'] as String? ?? '추가 작업';
    
    // 토스페이먼츠 결제 화면으로 이동
    // 주의: payments-confirm-toss는 추가결제 분기에서 original_order_id로 orders.id를 매칭함
    //       → originalOrderId 반드시 함께 전달해야 함 (없으면 레거시 extra_charge_requests 분기로 빠져 실패)
    // 주의: orderId 패턴은 웹과 동일하게 'EXTRA_<uuid>_<ts>' (대문자) - 웹 success URL 파싱과 통일
    context.push('/toss-payment', extra: {
      'orderId': 'EXTRA_${orderId}_${DateTime.now().millisecondsSinceEpoch}',
      'amount': price,
      'orderName': '$orderNumber - $note',
      'isExtraCharge': true,
      'originalOrderId': orderId,
    });
  }

  @override
  Widget build(BuildContext context) {
    // extra_charge_data에서 가격 정보 추출
    final extraChargeData = orderData['extra_charge_data'] as Map<String, dynamic>?;
    final price = extraChargeData?['managerPrice'] as int? ?? 0;
    final orderId = orderData['id'] as String;
    final note = extraChargeData?['managerNote'] as String? ?? '추가 작업이 필요합니다';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.orange.shade400,
            Colors.deepOrange.shade500,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.orange.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // 아이콘
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.payment,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  
                  // 텍스트 정보
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '💳 추가 결제 요청',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          note,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.white.withOpacity(0.95),
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '추가 금액: ${NumberFormat('#,###').format(price)}원',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              // 버튼들
              Row(
                children: [
                  // 주문 상세 보기 버튼
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => context.push('/orders/$orderId'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white, width: 1.5),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const Text(
                        '상세보기',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // 결제하기 버튼
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: () => _navigateToPayment(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.deepOrange,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        elevation: 0,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.credit_card, size: 18),
                          const SizedBox(width: 6),
                          Text(
                            '${NumberFormat('#,###').format(price)}원 결제',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

