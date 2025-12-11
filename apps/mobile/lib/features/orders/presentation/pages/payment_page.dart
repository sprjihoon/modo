import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../services/order_service.dart';
import '../../../../services/payment_service.dart';
import '../../domain/models/image_pin.dart';

/// 결제 페이지
class PaymentPage extends ConsumerStatefulWidget {
  final String orderId;

  const PaymentPage({
    required this.orderId, super.key,
  });

  @override
  ConsumerState<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends ConsumerState<PaymentPage> {
  final _orderService = OrderService();
  final _paymentService = PaymentService();
  final _supabase = Supabase.instance.client;
  bool _isLoading = false;
  bool _isLoadingPaymentMethods = true;
  Map<String, dynamic>? _orderData;
  List<Map<String, dynamic>> _paymentMethods = [];
  String? _selectedPaymentMethodId;

  @override
  void initState() {
    super.initState();
    _loadOrder();
    _loadPaymentMethods();
  }

  Future<void> _loadOrder() async {
    try {
      // 주문 정보만 직접 조회 (shipments, payments join 제거)
      final order = await _supabase
          .from('orders')
          .select('*')
          .eq('id', widget.orderId)
          .single();
          
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

  Future<void> _loadPaymentMethods() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        setState(() => _isLoadingPaymentMethods = false);
        return;
      }

      final methods = await _paymentService.getPaymentMethods();
      setState(() {
        _paymentMethods = methods;
        _isLoadingPaymentMethods = false;
        // 기본 결제수단 자동 선택
        if (methods.isNotEmpty) {
          final defaultMethod = methods.firstWhere(
            (m) => m['is_default'] == true,
            orElse: () => methods.first,
          );
          _selectedPaymentMethodId = defaultMethod['id'];
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingPaymentMethods = false);
      }
    }
  }

  /// 결제 진행
  Future<void> _processPayment() async {
    if (_selectedPaymentMethodId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('결제수단을 선택해주세요'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      // 선택한 결제수단 정보
      final paymentMethod = _paymentMethods.firstWhere(
        (m) => m['id'] == _selectedPaymentMethodId,
      );
      final billingKey = paymentMethod['billing_key'] as String;

      // 1. 빌링키로 결제
      final paymentResult = await _paymentService.payWithBillingKey(
        billingKey: billingKey,
        orderId: widget.orderId,
        amount: _orderData!['total_price'] as int,
        orderName: _orderData!['item_name'] as String,
      );

      if (!mounted) return;

      // 2. 수거예약
      final shipment = await _orderService.bookShipment(
        orderId: widget.orderId,
        pickupAddress: _orderData!['pickup_address'],
        pickupPhone: _orderData!['pickup_phone'] ?? '010-1234-5678',
        pickupZipcode: _orderData!['pickup_zipcode'] as String?,
        deliveryAddress: _orderData!['delivery_address'],
        deliveryPhone: _orderData!['delivery_phone'] ?? '010-1234-5678',
        deliveryZipcode: _orderData!['delivery_zipcode'] as String?,
        customerName: _orderData!['customer_name'],
        deliveryMessage: _orderData!['notes'] as String?, // 배송 요청사항 전달
      );

      if (!mounted) return;

      // 3. 주문 상세로 이동
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('결제 완료! 송장번호: ${shipment['tracking_no']}'),
          duration: const Duration(seconds: 3),
          backgroundColor: const Color(0xFF00C896),
        ),
      );

      context.go('/orders/${widget.orderId}');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('결제 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
  
  /// 실제 우체국 API 테스트 (결제 건너뛰고 수거예약만)
  Future<void> _testRealShipment({required bool testMode}) async {
    setState(() => _isLoading = true);

    try {
      // 주문 상태를 PAID로 업데이트 (결제 건너뛰기)
      await _supabase
          .from('orders')
          .update({
            'payment_status': 'PAID',
          })
          .eq('id', widget.orderId);

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(testMode ? '🧪 Mock 모드로 수거예약 시작...' : '🚚 실제 우체국 API로 수거예약 시작...'),
          backgroundColor: testMode ? Colors.orange : Colors.green,
          duration: const Duration(seconds: 2),
        ),
      );

      // Edge Function을 통한 수거예약 (실제 또는 Mock)
      final shipment = await _orderService.bookShipment(
        orderId: widget.orderId,
        pickupAddress: _orderData!['pickup_address'] ?? '테스트 주소',
        pickupPhone: _orderData!['pickup_phone'] ?? '010-1234-5678',
        pickupZipcode: _orderData!['pickup_zipcode'] as String?,
        deliveryAddress: _orderData!['delivery_address'] ?? '테스트 주소',
        deliveryPhone: _orderData!['delivery_phone'] ?? '010-1234-5678',
        deliveryZipcode: _orderData!['delivery_zipcode'] as String?,
        customerName: _orderData!['customer_name'] ?? '테스트 고객',
        deliveryMessage: _orderData!['notes'] as String?, // 배송 요청사항 전달
        testMode: testMode,
      );

      if (!mounted) return;

      // 성공 메시지
      final trackingNo = shipment['tracking_no'] ?? shipment['pickup_tracking_no'];
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            testMode 
              ? '✅ Mock 수거예약 완료!\n송장번호: $trackingNo'
              : '🎉 실제 우체국 수거예약 완료!\n송장번호: $trackingNo',
          ),
          duration: const Duration(seconds: 5),
          backgroundColor: const Color(0xFF00C896),
        ),
      );

      // 주문 목록으로 이동
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) {
        context.go('/orders');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('수거예약 실패: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
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
        backgroundColor: Colors.grey.shade50,
        appBar: AppBar(
          title: const Text('결제'),
          elevation: 0,
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('결제'),
        elevation: 0,
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
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.receipt_long_outlined,
                              color: Theme.of(context).colorScheme.primary,
                              size: 24,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '주문 정보',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey.shade800,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _buildInfoRow('수선 항목', _orderData!['item_name']),
                        _buildInfoRow('상세 설명', _orderData!['item_description']),
                        if (_orderData!['notes'] != null)
                          _buildInfoRow('요청사항', _orderData!['notes']),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // 첨부 사진 및 수선 부위 (핀 정보 표시)
                  if (_orderData!['images_with_pins'] != null && (_orderData!['images_with_pins'] as List).isNotEmpty)
                    _buildImagesWithPinsSection(),
                  if (_orderData!['images_with_pins'] != null && (_orderData!['images_with_pins'] as List).isNotEmpty)
                    const SizedBox(height: 16),
                  
                  // 결제 금액
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.payments_outlined,
                              color: Theme.of(context).colorScheme.primary,
                              size: 24,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '결제 금액',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey.shade800,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _buildInfoRow(
                          '기본 금액',
                          '₩${_orderData!['base_price'].toString().replaceAllMapped(
                            RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                            (Match m) => '${m[1]},',
                          )}',
                        ),
                        // 프로모션 할인이 있는 경우 표시
                        if (_orderData!['promotion_discount_amount'] != null && 
                            (_orderData!['promotion_discount_amount'] as int) > 0) ...[
                          const SizedBox(height: 12),
                          _buildInfoRow(
                            '프로모션 할인',
                            '-₩${_orderData!['promotion_discount_amount'].toString().replaceAllMapped(
                              RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                              (Match m) => '${m[1]},',
                            )}',
                            isDiscount: true,
                          ),
                        ],
                        Divider(height: 24, color: Colors.grey.shade200),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.primary.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '총 결제금액',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey.shade800,
                                ),
                              ),
                              Text(
                                '₩${_orderData!['total_price'].toString().replaceAllMapped(
                                  RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                  (Match m) => '${m[1]},',
                                )}',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // 결제 수단
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.credit_card_outlined,
                              color: Theme.of(context).colorScheme.primary,
                              size: 24,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '결제 수단',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey.shade800,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.blue.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  Icons.credit_card,
                                  color: Colors.blue.shade700,
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  '신용/체크카드',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.grey.shade800,
                                  ),
                                ),
                              ),
                              Icon(
                                Icons.chevron_right,
                                color: Colors.grey.shade400,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // 결제수단 선택
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(
                top: BorderSide(color: Colors.grey.shade200),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  '결제수단',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 12),
                
                if (_isLoadingPaymentMethods)
                  const Center(child: CircularProgressIndicator())
                else if (_paymentMethods.isEmpty)
                  OutlinedButton.icon(
                    onPressed: () async {
                      final result = await context.push<bool>('/profile/payment-methods/add');
                      if (result == true && mounted) {
                        _loadPaymentMethods();
                      }
                    },
                    icon: const Icon(Icons.add_card, size: 18),
                    label: const Text('카드 등록하기'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF00C896),
                      side: const BorderSide(color: Color(0xFF00C896)),
                    ),
                  )
                else
                  ..._paymentMethods.map((method) {
                    final isSelected = method['id'] == _selectedPaymentMethodId;
                    return RadioListTile<String>(
                      value: method['id'],
                      groupValue: _selectedPaymentMethodId,
                      onChanged: (value) {
                        setState(() {
                          _selectedPaymentMethodId = value;
                        });
                      },
                      activeColor: const Color(0xFF00C896),
                      title: Row(
                        children: [
                          Text(
                            method['card_company'] as String,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            method['card_number'] as String,
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                      contentPadding: EdgeInsets.zero,
                    );
                  }),
              ],
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
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // 실제 우체국 API 테스트 버튼
                  Row(
                    children: [
                      Expanded(
                        child: TextButton.icon(
                          onPressed: _isLoading ? null : () => _testRealShipment(testMode: true),
                          icon: const Icon(Icons.science_outlined, size: 18),
                          label: const Text('🧪 Mock 수거예약'),
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.orange,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextButton.icon(
                          onPressed: _isLoading ? null : () => _testRealShipment(testMode: false),
                          icon: const Icon(Icons.local_shipping_outlined, size: 18),
                          label: const Text('🚚 실제 우체국 API'),
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.green,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            backgroundColor: Colors.green.withOpacity(0.1),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // 정상 결제 버튼
                  ElevatedButton(
                    onPressed: (_isLoading || _selectedPaymentMethodId == null) ? null : _processPayment,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
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
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.lock_outline, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            '₩${_orderData!['total_price'].toString().replaceAllMapped(
                              RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                              (Match m) => '${m[1]},',
                            )} 결제하기',
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {bool isDiscount = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: isDiscount ? Colors.red : Colors.grey[600],
              fontWeight: isDiscount ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
          Flexible(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: isDiscount ? Colors.red : Colors.black87,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  /// 이미지와 핀 정보 섹션
  Widget _buildImagesWithPinsSection() {
    final imagesWithPins = _orderData!['images_with_pins'] as List;
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.photo_camera_outlined,
                color: Theme.of(context).colorScheme.primary,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                '첨부 사진 및 수선 부위',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF00C896).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${imagesWithPins.length}장',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF00C896),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // 이미지 목록
          ...imagesWithPins.asMap().entries.map((entry) {
            final index = entry.key;
            final imageData = entry.value as Map<String, dynamic>;
            final imagePath = imageData['imagePath'] as String;
            final pins = (imageData['pins'] as List?)?.map((p) {
              if (p is Map<String, dynamic>) {
                return ImagePin.fromJson(p);
              }
              return null;
            }).whereType<ImagePin>().toList() ?? [];
            
            return Column(
              children: [
                if (index > 0) const SizedBox(height: 16),
                _buildImageWithPins(imagePath, pins, index),
              ],
            );
          }),
        ],
      ),
    );
  }

  /// 개별 이미지와 핀 표시
  Widget _buildImageWithPins(String imagePath, List<ImagePin> pins, int index) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 이미지 헤더
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                '사진 ${index + 1}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade700,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '${pins.length}개 수선 부위',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        
        // 이미지
        Container(
          height: 200,
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300),
          ),
          clipBehavior: Clip.antiAlias,
          child: CachedNetworkImage(
            imageUrl: imagePath,
            fit: BoxFit.contain,
            placeholder: (context, url) => const Center(
              child: CircularProgressIndicator(),
            ),
            errorWidget: (context, url, error) => const Center(
              child: Icon(Icons.error, color: Colors.red),
            ),
          ),
        ),
        
        // 핀 리스트 (메모 포함)
        if (pins.isNotEmpty) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF00C896).withOpacity(0.05),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF00C896).withOpacity(0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.push_pin,
                      size: 16,
                      color: Color(0xFF00C896),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '수선 부위 상세',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade800,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ...pins.asMap().entries.map((pinEntry) {
                  final pinIndex = pinEntry.key;
                  final pin = pinEntry.value;
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 20,
                          height: 20,
                          decoration: const BoxDecoration(
                            color: Color(0xFF00C896),
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              '${pinIndex + 1}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            pin.memo.isEmpty ? '(메모 없음)' : pin.memo,
                            style: TextStyle(
                              fontSize: 13,
                              color: pin.memo.isEmpty ? Colors.grey.shade500 : Colors.grey.shade800,
                              fontStyle: pin.memo.isEmpty ? FontStyle.italic : FontStyle.normal,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

