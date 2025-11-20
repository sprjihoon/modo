import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../services/address_service.dart';
import '../../../../services/order_service.dart';
import '../../../../services/payment_service.dart';
import '../../providers/repair_items_provider.dart';

/// 수거신청 페이지
class PickupRequestPage extends ConsumerStatefulWidget {
  final List<Map<String, dynamic>> repairItems;
  final List<String> imageUrls;
  final List<Map<String, dynamic>>? imagesWithPins; // 핀 정보 추가
  
  const PickupRequestPage({
    required this.repairItems, required this.imageUrls, this.imagesWithPins, super.key,
  });

  @override
  ConsumerState<PickupRequestPage> createState() => _PickupRequestPageState();
}

class _PickupRequestPageState extends ConsumerState<PickupRequestPage> {
  final _recipientNameController = TextEditingController();
  final _recipientPhoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _addressDetailController = TextEditingController();
  final _zipcodeController = TextEditingController();
  final _requestController = TextEditingController();
  
  final _addressService = AddressService();
  final _orderService = OrderService();
  final _paymentService = PaymentService();
  
  String? _selectedAddressId;
  bool _isLoading = false;
  bool _isLoadingAddress = true;
  bool _isLoadingPaymentMethods = true;
  
  List<Map<String, dynamic>> _paymentMethods = [];
  String? _selectedPaymentMethodId;
  
  @override
  void initState() {
    super.initState();
    _loadDefaultAddress();
    _loadPaymentMethods();
  }
  
  /// 결제수단 목록 로드
  Future<void> _loadPaymentMethods() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        setState(() => _isLoadingPaymentMethods = false);
        return;
      }

      final methods = await _paymentService.getPaymentMethods(user.id);
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
      debugPrint('결제수단 로드 실패: $e');
      if (mounted) {
        setState(() => _isLoadingPaymentMethods = false);
      }
    }
  }
  
  @override
  void dispose() {
    _recipientNameController.dispose();
    _recipientPhoneController.dispose();
    _addressController.dispose();
    _addressDetailController.dispose();
    _zipcodeController.dispose();
    _requestController.dispose();
    super.dispose();
  }
  
  /// 기본 배송지 불러오기
  Future<void> _loadDefaultAddress() async {
    try {
      final defaultAddress = await _addressService.getDefaultAddress();
      if (defaultAddress != null && mounted) {
        setState(() {
          _selectedAddressId = defaultAddress['id'] as String;
          _recipientNameController.text = defaultAddress['recipient_name'] as String? ?? '';
          _recipientPhoneController.text = defaultAddress['recipient_phone'] as String? ?? '';
          _addressController.text = defaultAddress['address'] as String? ?? '';
          _addressDetailController.text = defaultAddress['address_detail'] as String? ?? '';
          _zipcodeController.text = defaultAddress['zipcode'] as String? ?? '';
          _isLoadingAddress = false;
        });
      } else {
        setState(() => _isLoadingAddress = false);
      }
    } catch (e) {
      debugPrint('기본 배송지 조회 실패: $e');
      setState(() => _isLoadingAddress = false);
    }
  }
  
  /// 배송지 변경
  Future<void> _changeAddress() async {
    final result = await context.push<Map<String, dynamic>>(
      '/profile/addresses',
      extra: {'isSelectionMode': true},
    );
    
    if (result != null && mounted) {
      // 선택된 배송지 정보 업데이트
      setState(() {
        _selectedAddressId = result['id'] as String;
        _recipientNameController.text = result['recipient_name'] as String? ?? '';
        _recipientPhoneController.text = result['recipient_phone'] as String? ?? '';
        _addressController.text = result['address'] as String? ?? '';
        _addressDetailController.text = result['address_detail'] as String? ?? '';
        _zipcodeController.text = result['zipcode'] as String? ?? '';
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('배송지가 변경되었습니다'),
          backgroundColor: Color(0xFF00C896),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }
  
  /// 주문 생성 및 결제로 이동
  Future<void> _createOrderAndProceedToPayment() async {
    if (_addressController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('배송지를 선택해주세요'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
    setState(() => _isLoading = true);
    
    try {
      debugPrint('🔧 주문 생성 시작...');
      debugPrint('수선 항목 개수: ${widget.repairItems.length}');
      
      // 주문 정보 구성
      final itemNames = widget.repairItems
          .map((item) => item['repairPart'] as String)
          .join(', ');
      
      final itemDescription = widget.repairItems
          .map((item) => '${item['repairPart']}: ${item['scope']} - ${item['measurement']}')
          .join('\n');
      
      // clothing_type 추출 (한글 그대로 사용)
      String clothingType = '기타';
      if (widget.repairItems.isNotEmpty) {
        final imagesWithPins = widget.repairItems[0]['imagesWithPins'];
        if (imagesWithPins is List && imagesWithPins.isNotEmpty) {
          clothingType = imagesWithPins[0]['clothingType'] ?? '기타';
        }
      }
      
      // repair_type 추출 (첫 번째 수선 항목에서)
      String repairType = '기타';
      if (widget.repairItems.isNotEmpty) {
        repairType = widget.repairItems[0]['repairPart'] ?? '기타';
      }
      
      // repair_parts 배열 생성
      List<String> repairParts = widget.repairItems
          .map((item) => item['repairPart'] as String)
          .toList();
      
      debugPrint('주문명: $itemNames');
      debugPrint('주문 상세: $itemDescription');
      debugPrint('의류 타입: $clothingType');
      debugPrint('수선 타입: $repairType');
      debugPrint('수선 부위들: $repairParts');
      
      final totalPrice = _calculateTotalPrice();
      
      // 모든 수선 항목의 사진과 핀을 모음
      final allImagesWithPins = <Map<String, dynamic>>[];
      for (var repairItem in widget.repairItems) {
        final itemImages = repairItem['imagesWithPins'] as List<Map<String, dynamic>>?;
        if (itemImages != null) {
          allImagesWithPins.addAll(itemImages);
        }
      }
      
      debugPrint('📦 주문 생성 중...');
      
      // 주문 생성
      final order = await _orderService.createOrder(
        itemName: itemNames,
        itemDescription: itemDescription,
        basePrice: totalPrice,
        totalPrice: totalPrice,
        pickupAddress: _addressController.text,
        pickupAddressDetail: _addressDetailController.text,
        pickupZipcode: _zipcodeController.text,
        deliveryAddress: _addressController.text, // 수거지 = 배송지
        deliveryAddressDetail: _addressDetailController.text,
        deliveryZipcode: _zipcodeController.text,
        imageUrls: widget.imageUrls,
        imagesWithPins: allImagesWithPins, // 모든 의류의 핀 정보
        notes: _requestController.text,
        clothingType: clothingType, // 의류 타입
        repairType: repairType, // 수선 타입
        repairParts: repairParts, // 수선 부위들
      );
      
      debugPrint('✅ 주문 생성 완료: ${order['id']}');
      
      if (mounted) {
        // 주문 생성 성공 - Provider 초기화
        ref.read(repairItemsProvider.notifier).clear();
        
        debugPrint('🔄 결제 페이지로 이동: ${order['id']}');
        
        // 결제 페이지로 이동
        context.push('/payment/${order['id']}');
      }
    } catch (e) {
      debugPrint('❌ 주문 생성 실패: $e');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('주문 생성 실패: $e'),
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
  
  // 총 예상 가격 계산
  int _calculateTotalPrice() {
    int total = 0;
    for (var item in widget.repairItems) {
      final priceRange = item['priceRange'] as String;
      final prices = priceRange.split('~');
      if (prices.isNotEmpty) {
        final minPrice = prices[0]
            .replaceAll('원', '')
            .replaceAll(',', '')
            .replaceAll('부위당', '')
            .trim();
        total += int.tryParse(minPrice) ?? 0;
      }
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    final totalPrice = _calculateTotalPrice();
    
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          '수거신청',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 신청 서비스
                    const Text(
                      '신청 서비스',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '수선',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 32),
                    
                    // 배송 정보
                    const Text(
                      '배송 정보',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 16),
                    
                    // 수령인 이름
                    const Text(
                      '수령인',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _recipientNameController,
                      readOnly: true,
                      decoration: InputDecoration(
                        hintText: '수령인 이름',
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Colors.grey.shade200,
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Colors.grey.shade200,
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 16,
                        ),
                        prefixIcon: const Icon(Icons.person_outline),
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    // 수령인 전화번호
                    TextField(
                      controller: _recipientPhoneController,
                      readOnly: true,
                      decoration: InputDecoration(
                        hintText: '전화번호',
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Colors.grey.shade200,
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Colors.grey.shade200,
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 16,
                        ),
                        prefixIcon: const Icon(Icons.phone_outlined),
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    // 주소
                    const Text(
                      '주소',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    
                    // 우편번호 + 주소 검색 버튼
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _zipcodeController,
                            readOnly: true,
                            decoration: InputDecoration(
                              hintText: '우편번호',
                              filled: true,
                              fillColor: Colors.grey.shade50,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color: Colors.grey.shade200,
                                ),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color: Colors.grey.shade200,
                                ),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 16,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton.icon(
                          onPressed: _changeAddress,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF00C896),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 16,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 0,
                          ),
                          icon: const Icon(Icons.location_on_outlined, size: 18),
                          label: const Text(
                            '배송지 변경',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    
                    // 주소
                    TextField(
                      controller: _addressController,
                      readOnly: true,
                      maxLines: 2,
                      decoration: InputDecoration(
                        hintText: '주소를 입력하세요',
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Colors.grey.shade200,
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Colors.grey.shade200,
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 16,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    // 상세주소
                    TextField(
                      controller: _addressDetailController,
                      decoration: InputDecoration(
                        hintText: '상세주소를 입력하세요',
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Colors.grey.shade200,
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Colors.grey.shade200,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: Color(0xFF00C896),
                            width: 2,
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 16,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    
                    Text(
                      '자유출입 가능 (공동현관 없음)',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 32),
                    
                    // 배송 요청사항
                    const Text(
                      '배송 요청사항',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    
                    TextField(
                      controller: _requestController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: '수거/배송 알림: 수거/배송 즉시\n배송 기사님께 전달할 내용을 적어주세요',
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Colors.grey.shade200,
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Colors.grey.shade200,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: Color(0xFF00C896),
                            width: 2,
                          ),
                        ),
                        contentPadding: const EdgeInsets.all(16),
                      ),
                    ),
                    const SizedBox(height: 32),
                    
                    // 결제수단
                    const Text(
                      '결제수단',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 16),
                    
                    // 결제수단 표시
                    if (_isLoadingPaymentMethods)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.all(20.0),
                          child: CircularProgressIndicator(),
                        ),
                      )
                    else if (_paymentMethods.isEmpty)
                      // 결제수단이 없을 때
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Colors.red.shade100,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.error_outline,
                              color: Colors.red.shade700,
                              size: 20,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: RichText(
                                text: TextSpan(
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: Colors.black87,
                                  ),
                                  children: [
                                    TextSpan(
                                      text: '결제수단을 등록',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: Colors.red.shade700,
                                      ),
                                    ),
                                    const TextSpan(text: '해주세요'),
                                  ],
                                ),
                              ),
                            ),
                            TextButton(
                              onPressed: () async {
                                final result = await context.push<bool>('/profile/payment-methods/add');
                                if (result == true && mounted) {
                                  _loadPaymentMethods();
                                }
                              },
                              style: TextButton.styleFrom(
                                backgroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              child: const Text(
                                '등록하기',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.black87,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      // 결제수단이 있을 때
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFF00C896),
                            width: 2,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: const Color(0xFF00C896).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(
                                Icons.credit_card,
                                color: Color(0xFF00C896),
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _paymentMethods.firstWhere(
                                      (m) => m['id'] == _selectedPaymentMethodId,
                                      orElse: () => _paymentMethods.first,
                                    )['card_company'].toString(),
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black87,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _paymentMethods.firstWhere(
                                      (m) => m['id'] == _selectedPaymentMethodId,
                                      orElse: () => _paymentMethods.first,
                                    )['card_number'].toString(),
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: () async {
                                final result = await context.push('/profile/payment-methods');
                                if (result == true && mounted) {
                                  _loadPaymentMethods();
                                }
                              },
                              style: TextButton.styleFrom(
                                backgroundColor: const Color(0xFF00C896).withOpacity(0.1),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              child: const Text(
                                '변경',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF00C896),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 12),
                    
                    // 안내 메시지
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Text(
                        '• 선택한 대표 결제수단으로 결제금액이 자동 결제됩니다.',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                          height: 1.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    
                    // 토스페이 이벤트 배너
                    InkWell(
                      onTap: () {
                        // TODO: 토스페이 이벤트 상세
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Colors.grey.shade200,
                          ),
                        ),
                        child: Row(
                          children: [
                            // 토스페이 로고
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: const Color(0xFF0064FF),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Center(
                                child: Icon(
                                  Icons.payment,
                                  color: Colors.white,
                                  size: 24,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    '토스페이 첫 결제 이벤트',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black87,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.grey.shade800,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Text(
                                          '13/14',
                                          style: TextStyle(
                                            fontSize: 10,
                                            color: Colors.white,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            Icon(
                              Icons.arrow_forward_ios,
                              size: 16,
                              color: Colors.grey.shade400,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                    
                    // 고지사항
                    const Text(
                      '고지사항',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 16),
                    
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.grey.shade200,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // 선불 서비스 안내
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF00C896).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.info_outline,
                                  color: Color(0xFF00C896),
                                  size: 18,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: RichText(
                                    text: const TextSpan(
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: Colors.black87,
                                        height: 1.4,
                                      ),
                                      children: [
                                        TextSpan(
                                          text: '선불 서비스',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF00C896),
                                          ),
                                        ),
                                        TextSpan(
                                          text: '입니다. 수거 신청 시 예상 금액이 결제됩니다.',
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          
                          // 고지사항 항목들
                          _buildNoticeItem(
                            '• 정확한 수선비는 입고 후 확정되며, 예상 금액과 차이가 있을 수 있습니다.',
                          ),
                          _buildNoticeItem(
                            '• 수선은 의류 상태에 따라 불가할 수 있으며, 이 경우 수선비는 청구되지 않습니다.',
                          ),
                          _buildNoticeItem(
                            '• 수선 소요 기간은 평균 7~10일이며, 의류 상태에 따라 변동될 수 있습니다.',
                          ),
                          _buildNoticeItem(
                            '• 의류 상태에 따라 추가 수선이 필요할 수 있으며, 사전 안내 후 진행됩니다.',
                          ),
                          _buildNoticeItem(
                            '• 수거 신청 후 취소는 수거 전까지만 가능합니다.',
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    
                    // 예상 금액
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.grey.shade200,
                        ),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                '총 예상 금액',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                              ),
                              Text(
                                '${totalPrice.toString().replaceAllMapped(
                                  RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                  (Match m) => '${m[1]},',
                                )}원~',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF00C896),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF00C896).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.info_outline,
                                  color: Color(0xFF00C896),
                                  size: 16,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '정확한 견적은 입고 후 확정됩니다',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade700,
                                    ),
                                  ),
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
          ),
          
          // 하단 버튼
          Container(
            padding: const EdgeInsets.all(20),
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
              child: ElevatedButton(
                onPressed: (_addressController.text.isEmpty || _isLoading)
                    ? null
                    : _createOrderAndProceedToPayment,
                style: ElevatedButton.styleFrom(
                  backgroundColor: (_addressController.text.isEmpty || _isLoading)
                      ? Colors.grey.shade300
                      : const Color(0xFF00C896),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                  minimumSize: const Size(double.infinity, 50),
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
                    : const Text(
                        '주문 생성 및 결제',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  // 고지사항 항목 위젯
  Widget _buildNoticeItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          color: Colors.grey.shade700,
          height: 1.5,
        ),
      ),
    );
  }
}

