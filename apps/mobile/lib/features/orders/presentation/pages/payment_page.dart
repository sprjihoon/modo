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
      // 누락된 필드는 build() 에서 null cast 로 터지지 않도록 안전 기본값을 채워둔다.
      final repairParts = (payload['repairParts'] as List?) ?? const [];
      final itemDescriptionFallback = repairParts.isEmpty
          ? '수선 서비스'
          : repairParts.map((e) {
              if (e is Map) {
                final name = e['name']?.toString() ?? '수선';
                final qty = (e['quantity'] as num?)?.toInt() ?? 1;
                return qty > 1 ? '$name x$qty' : name;
              }
              return e.toString();
            }).join(', ');
      // base_price 는 결제 인텐트 페이로드의 basePrice (수선비 합) 우선,
      // 없으면 total_price 에서 배송비/도서산간 차감.
      final shippingFee = (payload['shippingFee'] as num?)?.toInt() ?? 0;
      final remoteAreaFee = (payload['remoteAreaFee'] as num?)?.toInt() ?? 0;
      final shippingDiscount =
          (payload['shippingDiscountAmount'] as num?)?.toInt() ?? 0;
      final basePriceFromPayload = (payload['basePrice'] as num?)?.toInt();
      final totalPriceVal = (intent['total_price'] as num?)?.toInt() ?? 0;
      final basePrice = basePriceFromPayload ??
          (totalPriceVal -
              (shippingFee - shippingDiscount).clamp(0, 1 << 31) -
              remoteAreaFee);

      final virtual = <String, dynamic>{
        'id': intent['id'],
        'total_price': totalPriceVal,
        'item_name': (payload['itemName'] as String?)?.trim().isNotEmpty == true
            ? payload['itemName']
            : '수선',
        'item_description': itemDescriptionFallback,
        'base_price': basePrice,
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
        'shipping_fee': shippingFee,
        'shipping_discount_amount': shippingDiscount,
        'remote_area_fee': remoteAreaFee,
        'promotion_discount_amount':
            (payload['promotionDiscountAmount'] as num?)?.toInt() ?? 0,
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

    final amount = (_orderData!['total_price'] as num?)?.toInt() ?? 0;
    final orderName = (_orderData!['item_name'] as String?) ?? '수선';
    final customerName = (_orderData!['customer_name'] as String?) ?? '고객';

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
      }

      // 수거 예약 조건 검사 (웹 PaymentSuccessClient 와 동일)
      final pickupAddress = (_orderData?['pickup_address'] as String?) ?? '';
      final customerName = (_orderData?['customer_name'] as String?) ?? '';

      if (pickupAddress.isEmpty || customerName.isEmpty) {
        debugPrint('⚠️ 수거 예약 스킵: 주소 또는 고객 정보 없음');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('결제가 완료되었습니다.'),
              duration: Duration(seconds: 3),
              backgroundColor: Color(0xFF00C896),
            ),
          );
          context.go('/orders/$targetOrderId');
        }
        return;
      }

      try {
        final shipment = await _orderService.bookShipment(
          orderId: targetOrderId,
          pickupAddress: pickupAddress,
          pickupPhone: _orderData!['pickup_phone'] ?? '010-1234-5678',
          pickupZipcode: _orderData!['pickup_zipcode'] as String?,
          deliveryAddress: _orderData!['delivery_address'] ?? pickupAddress,
          deliveryPhone: _orderData!['delivery_phone'] ?? '010-1234-5678',
          deliveryZipcode: _orderData!['delivery_zipcode'] as String?,
          customerName: customerName,
          deliveryMessage: _orderData!['notes'] as String?,
        );

        if (!mounted) return;

        final trackingNo = shipment['tracking_no'] ?? shipment['pickup_tracking_no'];
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('결제 완료! 송장번호: ${trackingNo ?? '-'}'),
            duration: const Duration(seconds: 3),
            backgroundColor: const Color(0xFF00C896),
          ),
        );
      } catch (e) {
        debugPrint('❌ 수거 예약 실패 (무시): $e');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('결제 완료! 수거예약은 관리자가 처리합니다.\n($e)'),
              duration: const Duration(seconds: 4),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }

      if (mounted) {
        context.go('/orders/$targetOrderId');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  /// 실제 우체국 API 테스트 (결제 건너뛰고 수거예약만)
  ///
  /// 두 가지 흐름을 지원한다:
  ///   1) 신규 흐름 (_isIntentFlow == true): widget.orderId 가 payment_intents.id 인 경우
  ///      → `payments-test-skip` Edge Function 으로 인텐트 → orders 생성 → 수거예약을 한 번에 수행.
  ///      (웹의 /api/admin/test/skip-payment 와 동일한 동작)
  ///   2) 레거시 흐름: widget.orderId 가 이미 orders.id 인 경우
  ///      → orders.payment_status 만 PAID 로 갱신 후 shipments-book 직접 호출.
  Future<void> _testRealShipment({required bool testMode}) async {
    setState(() => _isLoading = true);

    try {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(testMode ? '🧪 Mock 모드로 수거예약 시작...' : '🚚 실제 우체국 API로 수거예약 시작...'),
          backgroundColor: testMode ? Colors.orange : Colors.green,
          duration: const Duration(seconds: 2),
        ),
      );

      String? trackingNo;
      String? bookErrorMessage;

      if (_isIntentFlow && _intentId != null) {
        final result = await _orderService.testSkipPaymentAndBook(
          intentId: _intentId!,
          testMode: testMode,
        );
        trackingNo = result['trackingNo'] as String?;
        bookErrorMessage = result['bookErrorMessage'] as String?;
      } else {
        await _supabase
            .from('orders')
            .update({'payment_status': 'PAID'})
            .eq('id', widget.orderId);

        // 수거 예약 조건 검사 (웹과 동일)
        final pickupAddress = (_orderData?['pickup_address'] as String?) ?? '';
        final customerName = (_orderData?['customer_name'] as String?) ?? '';

        if (pickupAddress.isEmpty || customerName.isEmpty) {
          debugPrint('⚠️ 수거 예약 스킵: 주소 또는 고객 정보 없음');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('주문 생성 완료! (수거 예약은 주소/고객 정보가 없어 생략됨)'),
                backgroundColor: Color(0xFF00C896),
                duration: Duration(seconds: 4),
              ),
            );
            await Future.delayed(const Duration(seconds: 2));
            if (mounted) context.go('/orders');
          }
          return;
        }

        final shipment = await _orderService.bookShipment(
          orderId: widget.orderId,
          pickupAddress: pickupAddress,
          pickupPhone: _orderData!['pickup_phone'] ?? '010-1234-5678',
          pickupZipcode: _orderData!['pickup_zipcode'] as String?,
          deliveryAddress: _orderData!['delivery_address'] ?? pickupAddress,
          deliveryPhone: _orderData!['delivery_phone'] ?? '010-1234-5678',
          deliveryZipcode: _orderData!['delivery_zipcode'] as String?,
          customerName: customerName,
          deliveryMessage: _orderData!['notes'] as String?,
          testMode: testMode,
        );
        trackingNo = (shipment['tracking_no'] ?? shipment['pickup_tracking_no']) as String?;
      }

      if (!mounted) return;

      if (bookErrorMessage != null && bookErrorMessage.isNotEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('주문은 생성되었지만 수거예약은 실패했습니다.\n$bookErrorMessage'),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 6),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              testMode
                ? '✅ Mock 수거예약 완료!\n송장번호: ${trackingNo ?? '-'}'
                : '🎉 실제 우체국 수거예약 완료!\n송장번호: ${trackingNo ?? '-'}',
            ),
            duration: const Duration(seconds: 5),
            backgroundColor: const Color(0xFF00C896),
          ),
        );
      }

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

    final amount = (_orderData!['total_price'] as num?)?.toInt() ?? 0;
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
          _buildInfoRow('수선 항목', (_orderData!['item_name'] as String?) ?? '수선'),
          _buildInfoRow(
            '상세 설명',
            (_orderData!['item_description'] as String?) ?? '-',
          ),
          if ((_orderData!['notes'] as String?)?.isNotEmpty == true)
            _buildInfoRow('요청사항', _orderData!['notes'] as String),
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
            '₩${((_orderData!['base_price'] as num?)?.toInt() ?? 0)
                .toString()
                .replaceAllMapped(
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
