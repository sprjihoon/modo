import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../services/order_service.dart';

/// 결제 페이지
class PaymentPage extends ConsumerStatefulWidget {
  final String orderId;

  const PaymentPage({
    super.key,
    required this.orderId,
  });

  @override
  ConsumerState<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends ConsumerState<PaymentPage> {
  final _orderService = OrderService();
  bool _isLoading = false;
  Map<String, dynamic>? _orderData;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    try {
      final order = await _orderService.getOrderDetail(widget.orderId);
      setState(() {
        _orderData = order;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('주문 조회 실패: $e')),
        );
      }
    }
  }

  /// 결제 진행
  Future<void> _processPayment() async {
    setState(() => _isLoading = true);

    try {
      // TODO: PortOne SDK 연동
      // import 'package:iamport_flutter/iamport_payment.dart';
      // final payment = IamportPayment(
      //   pg: 'html5_inicis',
      //   pay_method: 'card',
      //   merchant_uid: 'merchant_${widget.orderId}',
      //   amount: _orderData!['total_price'],
      //   name: _orderData!['item_name'],
      // );
      // final result = await Navigator.push(...);

      // Mock 결제 (개발용)
      await Future.delayed(const Duration(seconds: 2));
      
      final mockImpUid = 'imp_${DateTime.now().millisecondsSinceEpoch}';
      final mockMerchantUid = 'merchant_${widget.orderId}';

      // 1. 결제 검증
      await _orderService.verifyPayment(
        orderId: widget.orderId,
        impUid: mockImpUid,
        merchantUid: mockMerchantUid,
      );

      if (!mounted) return;

      // 2. 수거예약
      final shipment = await _orderService.bookShipment(
        orderId: widget.orderId,
        pickupAddress: _orderData!['pickup_address'],
        pickupPhone: '010-1234-5678',
        deliveryAddress: _orderData!['delivery_address'],
        deliveryPhone: '010-1234-5678',
        customerName: _orderData!['customer_name'],
      );

      if (!mounted) return;

      // 3. 주문 상세로 이동
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('결제 완료! 송장번호: ${shipment['tracking_no']}'),
          duration: const Duration(seconds: 3),
        ),
      );

      context.go('/orders/${widget.orderId}');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('결제 실패: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_orderData == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('결제')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('결제'),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 주문 정보
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '주문 정보',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          _buildInfoRow('수선 항목', _orderData!['item_name']),
                          _buildInfoRow('상세 설명', _orderData!['item_description']),
                          if (_orderData!['notes'] != null)
                            _buildInfoRow('요청사항', _orderData!['notes']),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // 결제 금액
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '결제 금액',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          _buildInfoRow(
                            '기본 금액',
                            '₩${_orderData!['base_price'].toString().replaceAllMapped(
                              RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                              (Match m) => '${m[1]},',
                            )}',
                          ),
                          const Divider(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                '총 결제금액',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                '₩${_orderData!['total_price'].toString().replaceAllMapped(
                                  RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                  (Match m) => '${m[1]},',
                                )}',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // 결제 수단 (추후 추가)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '결제 수단',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 12),
                          const ListTile(
                            leading: Icon(Icons.credit_card),
                            title: Text('신용/체크카드'),
                            trailing: Icon(Icons.chevron_right),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // 결제 버튼
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: ElevatedButton(
              onPressed: _isLoading ? null : _processPayment,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Text(
                      '₩${_orderData!['total_price'].toString().replaceAllMapped(
                        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                        (Match m) => '${m[1]},',
                      )} 결제하기',
                      style: const TextStyle(fontSize: 16),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}

