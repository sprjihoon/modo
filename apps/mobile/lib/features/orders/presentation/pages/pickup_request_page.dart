import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../services/address_service.dart';
import '../../../../services/order_service.dart';
import '../../../../services/payment_service.dart';
import '../../../../services/promotion_service.dart';
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
  
  // 배송지 정보 (신규 컨트롤러)
  bool _isDeliveryAddressSame = true; // 수거지와 배송지 동일 여부
  final _deliveryRecipientNameController = TextEditingController();
  final _deliveryRecipientPhoneController = TextEditingController();
  final _deliveryAddressController = TextEditingController();
  final _deliveryAddressDetailController = TextEditingController();
  final _deliveryZipcodeController = TextEditingController();
  
  final _requestController = TextEditingController();
  final _promotionCodeController = TextEditingController();
  
  final _addressService = AddressService();
  final _orderService = OrderService();
  final _promotionService = PromotionService();
  
  String? _selectedAddressId;
  bool _isLoading = false;
  bool _isLoadingAddress = true;
  bool _isValidatingPromoCode = false;
  
  // 프로모션 코드 관련
  Map<String, dynamic>? _appliedPromotion;
  String? _promotionErrorMessage;
  
  @override
  void initState() {
    super.initState();
    _loadDefaultAddress();
  }
  
  @override
  void dispose() {
    _recipientNameController.dispose();
    _recipientPhoneController.dispose();
    _addressController.dispose();
    _addressDetailController.dispose();
    _zipcodeController.dispose();
    
    _deliveryRecipientNameController.dispose();
    _deliveryRecipientPhoneController.dispose();
    _deliveryAddressController.dispose();
    _deliveryAddressDetailController.dispose();
    _deliveryZipcodeController.dispose();
    
    _requestController.dispose();
    _promotionCodeController.dispose();
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
  
  /// 배송지 변경 (수거지)
  Future<void> _changeAddress() async {
    final result = await context.push<Map<String, dynamic>>(
      '/profile/addresses',
      extra: {'isSelectionMode': true},
    );
    
    if (result != null && mounted) {
      // 선택된 수거지 정보 업데이트
      setState(() {
        _selectedAddressId = result['id'] as String;
        _recipientNameController.text = result['recipient_name'] as String? ?? '';
        _recipientPhoneController.text = result['recipient_phone'] as String? ?? '';
        _addressController.text = result['address'] as String? ?? '';
        _addressDetailController.text = result['address_detail'] as String? ?? '';
        _zipcodeController.text = result['zipcode'] as String? ?? '';
        
        // 배송지도 동일하게 설정되어 있다면 함께 업데이트
        if (_isDeliveryAddressSame) {
          _deliveryRecipientNameController.text = result['recipient_name'] as String? ?? '';
          _deliveryRecipientPhoneController.text = result['recipient_phone'] as String? ?? '';
          _deliveryAddressController.text = result['address'] as String? ?? '';
          _deliveryAddressDetailController.text = result['address_detail'] as String? ?? '';
          _deliveryZipcodeController.text = result['zipcode'] as String? ?? '';
        }
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('주소가 변경되었습니다'),
          backgroundColor: Color(0xFF00C896),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }
  
  /// 배송지 검색 (수선 후 받을 곳)
  Future<void> _searchDeliveryAddress() async {
    final result = await context.push<Map<String, dynamic>>(
      '/profile/addresses',
      extra: {'isSelectionMode': true},
    );
    
    if (result != null && mounted) {
      setState(() {
        _deliveryRecipientNameController.text = result['recipient_name'] as String? ?? '';
        _deliveryRecipientPhoneController.text = result['recipient_phone'] as String? ?? '';
        _deliveryAddressController.text = result['address'] as String? ?? '';
        _deliveryAddressDetailController.text = result['address_detail'] as String? ?? '';
        _deliveryZipcodeController.text = result['zipcode'] as String? ?? '';
      });
    }
  }
  
  /// 프로모션 코드 검증 및 적용
  Future<void> _validateAndApplyPromotionCode() async {
    final code = _promotionCodeController.text.trim();
    
    if (code.isEmpty) {
      setState(() {
        _promotionErrorMessage = '프로모션 코드를 입력해주세요';
        _appliedPromotion = null;
      });
      return;
    }
    
    setState(() {
      _isValidatingPromoCode = true;
      _promotionErrorMessage = null;
    });
    
    try {
      final totalPrice = _calculateTotalPrice();
      final promoData = await _promotionService.validatePromotionCode(
        code,
        orderAmount: totalPrice,
      );
      
      setState(() {
        _appliedPromotion = promoData;
        _promotionErrorMessage = null;
        _isValidatingPromoCode = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('프로모션 코드가 적용되었습니다 (${_formatPrice(promoData['discount_amount'] as int)}원 할인)'),
            backgroundColor: const Color(0xFF00C896),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _promotionErrorMessage = e.toString().replaceAll('Exception: ', '');
        _appliedPromotion = null;
        _isValidatingPromoCode = false;
      });
    }
  }
  
  /// 프로모션 코드 제거
  void _removePromotionCode() {
    setState(() {
      _appliedPromotion = null;
      _promotionCodeController.clear();
      _promotionErrorMessage = null;
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('프로모션 코드가 제거되었습니다'),
        backgroundColor: Colors.grey,
        duration: Duration(seconds: 2),
      ),
    );
  }
  
  /// 주문 생성 및 결제로 이동
  Future<void> _createOrderAndProceedToPayment() async {
    if (_addressController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('수거지를 선택해주세요'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
    // 배송지가 다른 경우 유효성 검사
    if (!_isDeliveryAddressSame) {
      if (_deliveryAddressController.text.isEmpty || 
          _deliveryRecipientNameController.text.isEmpty || 
          _deliveryRecipientPhoneController.text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('배송지 정보를 모두 입력해주세요'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }
    }
    
    // 배송지 알림 확인 (토요배송 휴무, 도서산간 등)
    try {
      final deliveryZipcode = _isDeliveryAddressSame 
          ? _zipcodeController.text 
          : _deliveryZipcodeController.text;
      final deliveryAddress = _isDeliveryAddressSame 
          ? _addressController.text 
          : _deliveryAddressController.text;
      
      if (deliveryZipcode.isNotEmpty) {
        final noticeResult = await _orderService.checkDeliveryNotice(
          zipcode: deliveryZipcode,
          address: deliveryAddress,
        );
        
        // 알림이 필요한 경우 사용자에게 확인
        if (noticeResult['shouldShowAlert'] == true && 
            noticeResult['alertMessage'] != null) {
          final confirmed = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('배송 알림'),
              content: Text(noticeResult['alertMessage']),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('취소'),
                ),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF00C896),
                  ),
                  child: const Text('계속 진행'),
                ),
              ],
            ),
          );
          
          if (confirmed != true) {
            return; // 사용자가 취소한 경우
          }
        }
      }
    } catch (e) {
      debugPrint('⚠️ 배송지 알림 확인 실패 (계속 진행): $e');
      // 실패해도 주문은 계속 진행
    }
    
    setState(() => _isLoading = true);
    
    try {
      debugPrint('🔧 주문 생성 시작...');
      debugPrint('수선 항목 개수: ${widget.repairItems.length}');
      debugPrint('배송지 동일 여부: $_isDeliveryAddressSame');
      
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
        final imagesWithPins = widget.repairItems[0]['itemImages']; // itemImages로 변경
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
      final List<String> repairParts = widget.repairItems
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
        final itemImages = repairItem['itemImages'] as List?; // itemImages로 변경
        if (itemImages != null) {
          for (var img in itemImages) {
            if (img is Map) {
              allImagesWithPins.add(Map<String, dynamic>.from(img));
            }
          }
        }
      }
      
      debugPrint('📦 주문 생성 중...');
      
      // 프로모션 코드 적용된 최종 금액 계산
      final finalTotalPrice = _appliedPromotion != null 
        ? (_appliedPromotion!['final_amount'] as int)
        : totalPrice;
      
      // 주문 생성
      final order = await _orderService.createOrder(
        itemName: itemNames,
        itemDescription: itemDescription,
        basePrice: totalPrice,
        totalPrice: finalTotalPrice, // 프로모션 할인 적용된 최종 금액
        
        // 수거지 정보
        pickupAddress: _addressController.text,
        pickupAddressDetail: _addressDetailController.text,
        pickupZipcode: _zipcodeController.text,
        // recipientName, recipientPhone은 아래에서 배송지 기준으로 설정됨
        
        // 배송지 정보 (조건부 설정)
        deliveryAddress: _isDeliveryAddressSame ? _addressController.text : _deliveryAddressController.text,
        deliveryAddressDetail: _isDeliveryAddressSame ? _addressDetailController.text : _deliveryAddressDetailController.text,
        deliveryZipcode: _isDeliveryAddressSame ? _zipcodeController.text : _deliveryZipcodeController.text,
        // TODO: API에 deliveryRecipientName, deliveryRecipientPhone 필드가 있다면 추가해야 함
        // 현재는 recipientName, recipientPhone을 공통으로 사용하는 구조일 수 있음
        
        imageUrls: widget.imageUrls,
        imagesWithPins: allImagesWithPins, // 모든 의류의 핀 정보
        notes: _requestController.text,
        clothingType: clothingType, // 의류 타입
        repairType: repairType, // 수선 타입
        repairParts: repairParts, // 수선 부위들
        promotionCodeId: _appliedPromotion?['id'] as String?, // 프로모션 코드 ID
        promotionDiscountAmount: _appliedPromotion?['discount_amount'] as int?, // 할인 금액
        originalTotalPrice: _appliedPromotion != null ? totalPrice : null, // 할인 전 원래 금액
        
        // 수취인 정보 (배송지 기준)
        recipientName: _isDeliveryAddressSame ? _recipientNameController.text : _deliveryRecipientNameController.text,
        recipientPhone: _isDeliveryAddressSame ? _recipientPhoneController.text : _deliveryRecipientPhoneController.text,
      );
      
      debugPrint('✅ 주문 생성 완료: ${order['id']}');
      
      // 프로모션 코드 사용 기록
      if (_appliedPromotion != null) {
        try {
          await _promotionService.recordPromotionCodeUsage(
            promotionCodeId: _appliedPromotion!['id'] as String,
            orderId: order['id'] as String,
            discountAmount: _appliedPromotion!['discount_amount'] as int,
            originalAmount: _appliedPromotion!['original_amount'] as int,
            finalAmount: _appliedPromotion!['final_amount'] as int,
          );
          debugPrint('✅ 프로모션 코드 사용 기록 완료');
        } catch (e) {
          debugPrint('⚠️ 프로모션 코드 사용 기록 실패 (주문은 생성됨): $e');
          // 주문은 이미 생성되었으므로 에러를 무시하고 계속 진행
        }
      }
      
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
  
  // 가격 포맷팅
  String _formatPrice(int price) {
    return price.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );
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
                    const SizedBox(height: 24),
                    
                    // 배송지 동일 여부 체크박스
                    InkWell(
                      onTap: () {
                        setState(() {
                          _isDeliveryAddressSame = !_isDeliveryAddressSame;
                          // 동일하게 설정하면 수거지 정보를 배송지에 복사
                          if (_isDeliveryAddressSame) {
                            _deliveryRecipientNameController.text = _recipientNameController.text;
                            _deliveryRecipientPhoneController.text = _recipientPhoneController.text;
                            _deliveryAddressController.text = _addressController.text;
                            _deliveryAddressDetailController.text = _addressDetailController.text;
                            _deliveryZipcodeController.text = _zipcodeController.text;
                          }
                        });
                      },
                      child: Row(
                        children: [
                          SizedBox(
                            width: 24,
                            height: 24,
                            child: Checkbox(
                              value: _isDeliveryAddressSame,
                              onChanged: (value) {
                                setState(() {
                                  _isDeliveryAddressSame = value ?? true;
                                  if (_isDeliveryAddressSame) {
                                    _deliveryRecipientNameController.text = _recipientNameController.text;
                                    _deliveryRecipientPhoneController.text = _recipientPhoneController.text;
                                    _deliveryAddressController.text = _addressController.text;
                                    _deliveryAddressDetailController.text = _addressDetailController.text;
                                    _deliveryZipcodeController.text = _zipcodeController.text;
                                  }
                                });
                              },
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(4),
                              ),
                              activeColor: const Color(0xFF00C896),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              '수선 수거지와 수선 후 배송받을 주소지가 동일합니다.',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.black87,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    // 배송지 입력 폼 (다를 경우 표시)
                    if (!_isDeliveryAddressSame) ...[
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            '배송받을 주소',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: Colors.black87,
                            ),
                          ),
                          TextButton(
                            onPressed: _searchDeliveryAddress,
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: const Size(50, 30),
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: const Text(
                              '주소 검색',
                              style: TextStyle(
                                color: Color(0xFF00C896),
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      
                      // 받는 분 이름
                      TextField(
                        controller: _deliveryRecipientNameController,
                        decoration: InputDecoration(
                          labelText: '받는 분',
                          hintText: '이름을 입력하세요',
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade200),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade200),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        ),
                      ),
                      const SizedBox(height: 12),
                      
                      // 받는 분 연락처
                      TextField(
                        controller: _deliveryRecipientPhoneController,
                        keyboardType: TextInputType.phone,
                        decoration: InputDecoration(
                          labelText: '연락처',
                          hintText: '010-0000-0000',
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade200),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade200),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        ),
                      ),
                      const SizedBox(height: 12),
                      
                      // 주소
                      TextField(
                        controller: _deliveryAddressController,
                        readOnly: true,
                        maxLines: 2,
                        onTap: _searchDeliveryAddress,
                        decoration: InputDecoration(
                          hintText: '주소를 검색하세요',
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade200),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade200),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        ),
                      ),
                      const SizedBox(height: 12),
                      
                      // 상세주소
                      TextField(
                        controller: _deliveryAddressDetailController,
                        decoration: InputDecoration(
                          hintText: '상세주소를 입력하세요',
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade200),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade200),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFF00C896), width: 2),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        ),
                      ),
                    ],
                    
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
                    const SizedBox(height: 16),
                    const SizedBox(height: 24),
                    
                    // 프로모션 코드 섹션
                    const Text(
                      '프로모션 코드',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 16),
                    
                    // 프로모션 코드가 적용된 경우
                    if (_appliedPromotion != null)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00C896).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFF00C896),
                            width: 1.5,
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _appliedPromotion!['code'] as String,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF00C896),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  if (_appliedPromotion!['description'] != null)
                                    Text(
                                      _appliedPromotion!['description'] as String,
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: Colors.grey.shade700,
                                      ),
                                    ),
                                  const SizedBox(height: 8),
                                  Text(
                                    '-${_formatPrice(_appliedPromotion!['discount_amount'] as int)}원 할인',
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.red,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close, color: Colors.grey),
                              onPressed: _removePromotionCode,
                              tooltip: '프로모션 코드 제거',
                            ),
                          ],
                        ),
                      )
                    // 프로모션 코드 입력 필드
                    else
                      Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _promotionCodeController,
                                  decoration: InputDecoration(
                                    hintText: '프로모션 코드를 입력하세요',
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide(color: Colors.grey.shade300),
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide(color: Colors.grey.shade300),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: const BorderSide(
                                        color: Color(0xFF00C896),
                                        width: 2,
                                      ),
                                    ),
                                    errorBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: const BorderSide(color: Colors.red),
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 14,
                                    ),
                                    errorText: _promotionErrorMessage,
                                  ),
                                  textCapitalization: TextCapitalization.characters,
                                  onChanged: (value) {
                                    if (_promotionErrorMessage != null) {
                                      setState(() {
                                        _promotionErrorMessage = null;
                                      });
                                    }
                                  },
                                ),
                              ),
                              const SizedBox(width: 12),
                              ElevatedButton(
                                onPressed: _isValidatingPromoCode
                                    ? null
                                    : _validateAndApplyPromotionCode,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF00C896),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 24,
                                    vertical: 14,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  elevation: 0,
                                ),
                                child: _isValidatingPromoCode
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(
                                            Colors.white,
                                          ),
                                        ),
                                      )
                                    : const Text(
                                        '적용',
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                              ),
                            ],
                          ),
                        ],
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
                            '• 수선 소요 기간은 약 5영업일이며, 의류 상태에 따라 변동될 수 있습니다.',
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
                          // 프로모션 할인이 있는 경우 원래 금액 표시
                          if (_appliedPromotion != null) ...[
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  '예상 금액',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.black54,
                                  ),
                                ),
                                Text(
                                  '${_formatPrice(totalPrice)}원~',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey.shade600,
                                    decoration: TextDecoration.lineThrough,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  '프로모션 할인',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.red,
                                  ),
                                ),
                                Text(
                                  '-${_formatPrice(_appliedPromotion!['discount_amount'] as int)}원',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: Colors.red,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Divider(color: Colors.grey.shade300),
                            const SizedBox(height: 12),
                          ],
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                _appliedPromotion != null ? '최종 결제 금액' : '총 예상 금액',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                              ),
                              Text(
                                '${_formatPrice(_appliedPromotion != null 
                                  ? (_appliedPromotion!['final_amount'] as int)
                                  : totalPrice,)}원~',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF00C896),
                                ),
                              ),
                            ],
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

