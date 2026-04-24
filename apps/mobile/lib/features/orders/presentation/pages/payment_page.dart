import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../../../../core/widgets/modo_app_bar.dart';
import '../../../../services/order_service.dart';
import '../../domain/models/image_pin.dart';

/// 결제 페이지 - 토스페이먼츠 사용
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
  final _supabase = Supabase.instance.client;
  
  bool _isLoading = false;
  Map<String, dynamic>? _orderData;
  bool _showTestButtons = false;

  // 신규 흐름: payment_intent 기반 결제
  //   widget.orderId 가 payment_intents.id 인 경우 _isIntentFlow = true.
  //   _orderData 는 intent.payload 로부터 구성된 가상 주문 데이터.
  bool _isIntentFlow = false;
  String? _intentId;

  @override
  void initState() {
    super.initState();
    _loadOrder();
    _loadTestButtonsSetting();
  }

  Future<void> _loadTestButtonsSetting() async {
    try {
      final result = await _supabase
          .from('ops_center_settings')
          .select('show_test_buttons')
          .limit(1)
          .maybeSingle();
      
      if (mounted && result != null) {
        setState(() {
          _showTestButtons = result['show_test_buttons'] ?? false;
        });
      }
    } catch (e) {
      debugPrint('테스트 버튼 설정 로드 실패: $e');
    }
  }

  Future<void> _loadOrder() async {
    // 1) 먼저 orders 에서 조회 (레거시/이미 결제된 흐름)
    try {
      final order = await _supabase
          .from('orders')
          .select('*')
          .eq('id', widget.orderId)
          .maybeSingle();
      if (order != null) {
        setState(() {
          _orderData = Map<String, dynamic>.from(order as Map);
          _isIntentFlow = false;
        });
        return;
      }
    } catch (_) {/* fallthrough → intent 조회 */}

    // 2) payment_intents 에서 조회 (신규 흐름)
    try {
      final intent = await _supabase
          .from('payment_intents')
          .select('id, total_price, payload, expires_at, consumed_at')
          .eq('id', widget.orderId)
          .maybeSingle();

      if (intent == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('결제 정보를 찾을 수 없습니다.')),
          );
        }
        return;
      }
      if (intent['consumed_at'] != null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('이미 결제가 완료된 주문입니다.')),
          );
        }
        return;
      }

      final payload = Map<String, dynamic>.from(
        (intent['payload'] as Map?) ?? const {},
      );

      // intent.payload 를 _orderData 와 호환되는 형태로 매핑
      final virtual = <String, dynamic>{
        'id': intent['id'],
        'total_price': intent['total_price'],
        'item_name': payload['itemName'] ?? '수선',
        'customer_name': payload['customerName'] ?? '고객',
        'pickup_address': payload['pickupAddress'] ?? '',
        'pickup_address_detail': payload['pickupAddressDetail'],
        'pickup_zipcode': payload['pickupZipcode'],
        'pickup_phone': payload['pickupPhone'],
        'delivery_address': payload['deliveryAddress'] ?? payload['pickupAddress'] ?? '',
        'delivery_address_detail': payload['deliveryAddressDetail'],
        'delivery_zipcode': payload['deliveryZipcode'],
        'delivery_phone': payload['deliveryPhone'],
        'images_with_pins': payload['imagesWithPins'],
        'notes': payload['notes'],
        'shipping_fee': payload['shippingFee'],
        'shipping_discount_amount': payload['shippingDiscountAmount'],
        'remote_area_fee': payload['remoteAreaFee'],
        'promotion_discount_amount': payload['promotionDiscountAmount'],
        'original_total_price': payload['originalTotalPrice'],
      };

      setState(() {
        _orderData = virtual;
        _isIntentFlow = true;
        _intentId = intent['id'] as String;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('주문 조회 실패: $e')),
        );
      }
    }
  }

  /// 토스페이먼츠 결제 페이지로 이동
  Future<void> _goToTossPayment() async {
    if (_orderData == null) return;

    final amount = _orderData!['total_price'] as int;
    final orderName = _orderData!['item_name'] as String;
    final customerName = _orderData!['customer_name'] as String? ?? '고객';

    // 신규 흐름: payment_intents.id 를 그대로 Toss orderId 로 사용
    //   payments-confirm-toss 가 intentId 로 인텐트 조회 → orders insert (PAID)
    // 레거시 흐름: 'MODO_<orderUuid>_<rand>' 형태 (extra-charge 등 호환용)
    final tossOrderId = _isIntentFlow
        ? _intentId!
        : 'MODO_${widget.orderId}_${const Uuid().v4().substring(0, 8)}';

    final result = await context.push<bool>(
      '/toss-payment',
      extra: {
        'orderId': tossOrderId,
        'amount': amount,
        'orderName': orderName,
        'customerName': customerName,
        'isExtraCharge': false,
        // intent 흐름이면 originalOrderId 를 보내지 않아 신규 흐름이 트리거됨
        if (!_isIntentFlow) 'originalOrderId': widget.orderId,
        'isIntentFlow': _isIntentFlow,
      },
    );

    if (result == true && mounted) {
      await _processAfterPayment();
    }
  }

  /// 결제 후 수거예약 처리
  Future<void> _processAfterPayment() async {
    setState(() => _isLoading = true);

    try {
      String targetOrderId = widget.orderId;

      if (_isIntentFlow && _intentId != null) {
        // 신규 흐름: payment_intent 가 consumed_order_id 를 가지고 있어야 함.
        //   payments-confirm-toss 가 성공한 직후 update 됨.
        for (var i = 0; i < 10; i++) {
          final row = await _supabase
              .from('payment_intents')
              .select('consumed_order_id')
              .eq('id', _intentId!)
              .maybeSingle();
          final consumed = row?['consumed_order_id'] as String?;
          if (consumed != null) {
            targetOrderId = consumed;
            break;
          }
          await Future.delayed(const Duration(milliseconds: 500));
        }

        // edge function 이 이미 수거예약을 호출하지 않으므로 여기서 호출
        // intent 결제 흐름은 _orderData 가 intent.payload 기반 가상 데이터지만,
        // shipments-book 호출에 필요한 모든 필드를 포함.
      }

      final shipment = await _orderService.bookShipment(
        orderId: targetOrderId,
        pickupAddress: _orderData!['pickup_address'] ?? '',
        pickupPhone: _orderData!['pickup_phone'] ?? '010-1234-5678',
        pickupZipcode: _orderData!['pickup_zipcode'] as String?,
        deliveryAddress: _orderData!['delivery_address'] ?? '',
        deliveryPhone: _orderData!['delivery_phone'] ?? '010-1234-5678',
        deliveryZipcode: _orderData!['delivery_zipcode'] as String?,
        customerName: _orderData!['customer_name'] ?? '고객',
        deliveryMessage: _orderData!['notes'] as String?,
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('결제 완료! 송장번호: ${shipment['tracking_no']}'),
          duration: const Duration(seconds: 3),
          backgroundColor: const Color(0xFF00C896),
        ),
      );

      context.go('/orders/$targetOrderId');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('수거예약 실패: $e'),
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
      await _supabase
          .from('orders')
          .update({'payment_status': 'PAID'})
          .eq('id', widget.orderId);

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(testMode ? '🧪 Mock 모드로 수거예약 시작...' : '🚚 실제 우체국 API로 수거예약 시작...'),
          backgroundColor: testMode ? Colors.orange : Colors.green,
          duration: const Duration(seconds: 2),
        ),
      );

      final shipment = await _orderService.bookShipment(
        orderId: widget.orderId,
        pickupAddress: _orderData!['pickup_address'] ?? '테스트 주소',
        pickupPhone: _orderData!['pickup_phone'] ?? '010-1234-5678',
        pickupZipcode: _orderData!['pickup_zipcode'] as String?,
        deliveryAddress: _orderData!['delivery_address'] ?? '테스트 주소',
        deliveryPhone: _orderData!['delivery_phone'] ?? '010-1234-5678',
        deliveryZipcode: _orderData!['delivery_zipcode'] as String?,
        customerName: _orderData!['customer_name'] ?? '테스트 고객',
        deliveryMessage: _orderData!['notes'] as String?,
        testMode: testMode,
      );

      if (!mounted) return;

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
        appBar: const ModoAppBar(
          title: Text('결제'),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final amount = _orderData!['total_price'] as int;
    final formattedAmount = amount.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: const ModoAppBar(
        title: Text('결제'),
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
                  _buildOrderInfoSection(),
                  const SizedBox(height: 16),
                  
                  // 첨부 사진 및 수선 부위
                  if (_orderData!['images_with_pins'] != null && 
                      (_orderData!['images_with_pins'] as List).isNotEmpty)
                    _buildImagesWithPinsSection(),
                  if (_orderData!['images_with_pins'] != null && 
                      (_orderData!['images_with_pins'] as List).isNotEmpty)
                    const SizedBox(height: 16),
                  
                  // 결제 금액
                  _buildPriceSection(formattedAmount),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
          
          // 결제 버튼
          _buildBottomButtons(formattedAmount),
        ],
      ),
    );
  }

  Widget _buildOrderInfoSection() {
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
    );
  }

  Widget _buildPriceSection(String formattedAmount) {
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
                  '₩$formattedAmount',
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
    );
  }

  Widget _buildBottomButtons(String formattedAmount) {
    return Container(
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
            // 테스트 버튼 (관리자 설정에서 ON일 때만 표시)
            if (_showTestButtons) ...[
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
            ],
            // 토스페이먼츠 결제 버튼 - 클릭 시 결제 페이지로 이동
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _goToTossPayment,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  backgroundColor: const Color(0xFF0064FF),
                  disabledBackgroundColor: Colors.grey.shade300,
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
                          const Icon(Icons.lock_outline, size: 20, color: Colors.white),
                          const SizedBox(width: 8),
                          Text(
                            '₩$formattedAmount 결제하기',
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ],
        ),
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

  Widget _buildImageWithPins(String imagePath, List<ImagePin> pins, int index) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
                    const Icon(Icons.push_pin, size: 16, color: Color(0xFF00C896)),
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
