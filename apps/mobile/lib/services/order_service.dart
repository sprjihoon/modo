import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 주문 서비스
class OrderService {
  final _supabase = Supabase.instance.client;

  /// 주문 생성
  Future<Map<String, dynamic>> createOrder({
    required String itemName,
    required String itemDescription,
    required int basePrice,
    required int totalPrice,
    required String pickupAddress,
    required String deliveryAddress,
    String? pickupAddressDetail,
    String? deliveryAddressDetail,
    String? pickupZipcode,
    String? deliveryZipcode,
    List<String>? imageUrls,
    List<Map<String, dynamic>>? imagesWithPins, // 핀 정보 추가
    String? notes,
    String? clothingType, // 의류 타입 추가
    String? repairType, // 수선 타입 추가
    List<String>? repairParts, // 수선 부위들 추가
    String? promotionCodeId, // 프로모션 코드 ID
    int? promotionDiscountAmount, // 프로모션 할인 금액
    int? originalTotalPrice, // 할인 전 원래 금액
    String? recipientName, // 수취인 이름
    String? recipientPhone, // 수취인 전화번호
  }) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('로그인이 필요합니다');
      }

      // users 테이블 권한 문제로 인해 auth.uid() 직접 사용
      debugPrint('📋 Auth User ID: ${user.id}');

      // 주문 생성 (실제 DB 구조에 맞게)
      final orderNumber = 'ORD${DateTime.now().millisecondsSinceEpoch}';
      
      // 현재 사용자 정보
      final userEmail = user.email ?? 'unknown@example.com';
      
      final orderData = <String, dynamic>{
        'user_id': user.id,
        'order_number': orderNumber,
        'clothing_type': clothingType ?? '기타',
        'repair_type': repairType ?? '기타',
        'base_price': basePrice,
        'total_price': totalPrice,
        'item_name': itemName,
        'item_description': itemDescription,
        'pickup_address': pickupAddress,
        'pickup_address_detail': pickupAddressDetail,
        'pickup_zipcode': pickupZipcode,
        'delivery_address': deliveryAddress,
        'delivery_address_detail': deliveryAddressDetail,
        'delivery_zipcode': deliveryZipcode,
        'customer_name': recipientName ?? '수취인',
        'customer_email': userEmail,
        'customer_phone': recipientPhone ?? '010-0000-0000',
        'pickup_phone': recipientPhone ?? '010-0000-0000',
        'delivery_phone': recipientPhone ?? '010-0000-0000',
        'notes': notes,
      };
      
      // 프로모션 코드 정보 추가
      if (promotionCodeId != null) {
        orderData['promotion_code_id'] = promotionCodeId;
        orderData['promotion_discount_amount'] = promotionDiscountAmount ?? 0;
        orderData['original_total_price'] = originalTotalPrice ?? totalPrice;
      }
      
      // repair_parts 배열 추가
      if (repairParts != null && repairParts.isNotEmpty) {
        orderData['repair_parts'] = repairParts;
      }
      
      // repair_detail에 상세 정보 저장
      if (itemDescription.isNotEmpty) {
        orderData['repair_detail'] = itemDescription;
      }
      
      // images에 사진 정보 저장 (jsonb)
      if (imageUrls != null && imageUrls.isNotEmpty) {
        orderData['images'] = {'urls': imageUrls};
      }
      
      // images_with_pins에 핀 정보 저장 (jsonb)
      if (imagesWithPins != null && imagesWithPins.isNotEmpty) {
        orderData['images_with_pins'] = imagesWithPins;
      }

      debugPrint('📦 주문 데이터 (실제 컬럼): $orderData');

      final order = await _supabase.from('orders').insert(orderData).select().single();
      debugPrint('✅ 주문 생성 성공: ${order['id']}');
      
      return order;

      return order;
    } catch (e) {
      throw Exception('주문 생성 실패: $e');
    }
  }

  /// 내 주문 목록 조회
  Future<List<Map<String, dynamic>>> getMyOrders() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('로그인이 필요합니다');
      }

      final orders = await _supabase
          .from('orders')
          .select('''
            *,
            shipments (*),
            payments (*)
          ''')
          .order('created_at', ascending: false);

      return List<Map<String, dynamic>>.from(orders);
    } catch (e) {
      throw Exception('주문 조회 실패: $e');
    }
  }

  /// 주문 상세 조회
  Future<Map<String, dynamic>> getOrderDetail(String orderId) async {
    try {
      final order = await _supabase
          .from('orders')
          .select('''
            *,
            shipments (*),
            payments (*)
          ''')
          .eq('id', orderId)
          .single();

      return order;
    } catch (e) {
      throw Exception('주문 상세 조회 실패: $e');
    }
  }

  /// 결제 검증 (Edge Function 호출)
  Future<Map<String, dynamic>> verifyPayment({
    required String orderId,
    required String impUid,
    required String merchantUid,
  }) async {
    try {
      final response = await _supabase.functions.invoke(
        'payments-verify',
        body: {
          'order_id': orderId,
          'imp_uid': impUid,
          'merchant_uid': merchantUid,
        },
      );

      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? '결제 검증 실패');
      }

      return response.data['data'];
    } catch (e) {
      throw Exception('결제 검증 실패: $e');
    }
  }

  /// 수거예약 (Edge Function 호출)
  Future<Map<String, dynamic>> bookShipment({
    required String orderId,
    required String pickupAddress,
    required String pickupPhone,
    required String deliveryAddress,
    required String deliveryPhone,
    required String customerName,
    bool testMode = false,  // 실제 우체국 API 사용: false, Mock: true
  }) async {
    try {
      debugPrint('📦 수거예약 시작 (testMode: $testMode)');
      
      final response = await _supabase.functions.invoke(
        'shipments-book',
        body: {
          'order_id': orderId,
          'pickup_address': pickupAddress,
          'pickup_phone': pickupPhone,
          'delivery_address': deliveryAddress,
          'delivery_phone': deliveryPhone,
          'customer_name': customerName,
          'test_mode': testMode,  // 실제 API 사용 여부
        },
      );

      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? '수거예약 실패');
      }

      return response.data['data'];
    } catch (e) {
      throw Exception('수거예약 실패: $e');
    }
  }

  /// 이미지 업로드 (Supabase Storage)
  Future<String> uploadImage(String filePath) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('로그인이 필요합니다');
      }

      // 파일을 읽어서 업로드
      // Note: XFile이나 실제 파일 경로인 경우
      // import 'dart:io';
      // final file = File(filePath);
      // final bytes = await file.readAsBytes();
      
      // 파일명 생성 (중복 방지)
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final random = DateTime.now().microsecond;
      final fileName = '${user.id}_${timestamp}_$random.jpg';
      final storagePath = 'orders/$fileName';
      
      // Supabase Storage에 업로드
      // await _supabase.storage
      //     .from('order-images')
      //     .uploadBinary(storagePath, bytes);
      
      // 공개 URL 가져오기
      // final imageUrl = _supabase.storage
      //     .from('order-images')
      //     .getPublicUrl(storagePath);
      
      // return imageUrl;
      
      // 현재: Mock URL 반환 (실제 파일 업로드는 Storage 버킷 생성 후 활성화)
      return filePath;
    } catch (e) {
      throw Exception('이미지 업로드 실패: $e');
    }
  }
  
  /// 여러 이미지 업로드
  Future<List<String>> uploadImages(List<String> filePaths) async {
    final uploadedUrls = <String>[];
    
    for (final filePath in filePaths) {
      try {
        final url = await uploadImage(filePath);
        uploadedUrls.add(url);
      } catch (e) {
        debugPrint('이미지 업로드 실패: $filePath, 에러: $e');
        // 실패한 이미지는 건너뛰고 계속 진행
      }
    }
    
    return uploadedUrls;
  }
}

