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

      // orders 테이블만 조회 (tracking_no는 orders 테이블에 있음)
      final response = await _supabase
          .from('orders')
          .select('*')
          .order('created_at', ascending: false);

      // 타입 안전하게 변환
      final orders = (response as List).map((order) {
        final orderMap = Map<String, dynamic>.from(order as Map);
        final trackingNo = orderMap['tracking_no'] as String?;
        
        return <String, dynamic>{
          ...orderMap,
          'shipments': trackingNo != null ? <Map<String, dynamic>>[{
            'tracking_no': trackingNo,
            'pickup_tracking_no': trackingNo,
            'order_id': orderMap['id'],
          }] : <Map<String, dynamic>>[],
        };
      }).toList();

      return orders;
    } catch (e) {
      throw Exception('주문 조회 실패: $e');
    }
  }

  /// 주문 상세 조회
  Future<Map<String, dynamic>> getOrderDetail(String orderId) async {
    try {
      debugPrint('🔍 주문 상세 조회 시작: $orderId');
      
      // orders 테이블만 조회
      final response = await _supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

      debugPrint('✅ 주문 조회 성공: ${response['id']}');

      // 타입 안전하게 변환
      final order = Map<String, dynamic>.from(response as Map);

      // shipments 테이블에서 실제 데이터 조회
      List<Map<String, dynamic>> shipments = [];
      try {
        final shipmentsResponse = await _supabase
            .from('shipments')
            .select('*')
            .eq('order_id', orderId);
        
        if (shipmentsResponse != null && shipmentsResponse is List) {
          shipments = shipmentsResponse.map((s) => Map<String, dynamic>.from(s as Map)).toList();
          debugPrint('✅ Shipments 조회 성공: ${shipments.length}개');
        }
      } catch (shipmentError) {
        debugPrint('⚠️ Shipments 조회 실패 (계속 진행): $shipmentError');
      }

      final result = {
        ...order,
        'shipments': shipments,
      };
      
      debugPrint('✅ 주문 상세 데이터 준비 완료');
      return result;
    } catch (e) {
      debugPrint('❌ 주문 상세 조회 오류: $e');
      throw Exception('주문 상세 조회 실패: $e');
    }
  }

  /// 배송추적 조회 (Edge Function 호출)
  Future<Map<String, dynamic>> trackShipment(String trackingNo) async {
    try {
      debugPrint('📦 배송추적 조회 시작: $trackingNo');
      
      // POST 요청으로 body에 tracking_no 전달
      final response = await _supabase.functions.invoke(
        'shipments-track',
        body: {'tracking_no': trackingNo},
      );

      debugPrint('✅ 배송추적 응답: ${response.data}');

      if (response.data != null) {
        // 응답이 성공인지 확인
        final data = Map<String, dynamic>.from(response.data);
        if (data.containsKey('error')) {
          throw Exception(data['error'] as String? ?? '배송추적 정보를 가져올 수 없습니다');
        }
        return data;
      } else {
        throw Exception('배송추적 정보를 가져올 수 없습니다');
      }
    } on FunctionException catch (e) {
      debugPrint('❌ FunctionException: ${e.status} - ${e.toString()}');
      if (e.status == 404) {
        throw Exception('배송추적 기능이 아직 배포되지 않았습니다. 관리자에게 문의하세요.');
      }
      throw Exception('배송추적 조회 실패: ${e.toString()}');
    } catch (e) {
      debugPrint('❌ 배송추적 조회 오류: $e');
      throw Exception('배송추적 조회 실패: $e');
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

  /// 수거 취소 (Edge Function 호출)
  Future<Map<String, dynamic>> cancelShipment(String orderId, {bool deleteAfterCancel = false}) async {
    try {
      debugPrint('🚫 수거 취소 시작: $orderId');
      
      final response = await _supabase.functions.invoke(
        'shipments-cancel',
        body: {
          'order_id': orderId,
          'delete_after_cancel': deleteAfterCancel,
        },
      );

      debugPrint('✅ 수거 취소 응답: ${response.data}');

      if (response.data != null) {
        final data = Map<String, dynamic>.from(response.data);
        if (data.containsKey('error')) {
          throw Exception(data['error'] as String? ?? '수거 취소 실패');
        }
        return data;
      } else {
        throw Exception('수거 취소 정보를 가져올 수 없습니다');
      }
    } on FunctionException catch (e) {
      debugPrint('❌ FunctionException: ${e.status} - ${e.toString()}');
      if (e.status == 404) {
        throw Exception('수거 취소 기능이 아직 배포되지 않았습니다. 관리자에게 문의하세요.');
      }
      throw Exception('수거 취소 실패: ${e.toString()}');
    } catch (e) {
      debugPrint('❌ 수거 취소 오류: $e');
      throw Exception('수거 취소 실패: $e');
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
    String? pickupZipcode,  // 수거지 우편번호
    String? deliveryZipcode, // 배송지 우편번호 (필수)
    bool testMode = false,  // 실제 우체국 API 사용: false, Mock: true
  }) async {
    try {
      debugPrint('📦 수거예약 시작 (testMode: $testMode)');
      debugPrint('📍 배송지 우편번호: $deliveryZipcode');
      
      final body = <String, dynamic>{
          'order_id': orderId,
          'pickup_address': pickupAddress,
          'pickup_phone': pickupPhone,
          'delivery_address': deliveryAddress,
          'delivery_phone': deliveryPhone,
          'customer_name': customerName,
          'test_mode': testMode,  // 실제 API 사용 여부
      };
      
      // 우편번호 추가 (배송지 우편번호는 필수)
      if (pickupZipcode != null && pickupZipcode.isNotEmpty) {
        body['pickup_zipcode'] = pickupZipcode;
      }
      if (deliveryZipcode != null && deliveryZipcode.isNotEmpty) {
        body['delivery_zipcode'] = deliveryZipcode;
      } else {
        debugPrint('⚠️ 배송지 우편번호가 없습니다!');
      }
      
      final response = await _supabase.functions.invoke(
        'shipments-book',
        body: body,
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

