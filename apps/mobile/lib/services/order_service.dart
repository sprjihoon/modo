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
    String? notes,
  }) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('로그인이 필요합니다');
      }

      // 사용자 정보 조회
      final userProfile = await _supabase
          .from('users')
          .select('id, name, email, phone')
          .eq('auth_id', user.id)
          .single();

      // 주문 생성
      final order = await _supabase.from('orders').insert({
        'user_id': userProfile['id'],
        'customer_name': userProfile['name'],
        'customer_email': userProfile['email'],
        'customer_phone': userProfile['phone'],
        'item_name': itemName,
        'item_description': itemDescription,
        'base_price': basePrice,
        'total_price': totalPrice,
        'pickup_address': pickupAddress,
        'pickup_address_detail': pickupAddressDetail,
        'pickup_zipcode': pickupZipcode,
        'delivery_address': deliveryAddress,
        'delivery_address_detail': deliveryAddressDetail,
        'delivery_zipcode': deliveryZipcode,
        'image_urls': imageUrls,
        'notes': notes,
        'status': 'PENDING',
        'payment_status': 'PENDING',
      }).select().single();

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
            shipments (
              *,
              pickup_tracking_no,
              delivery_tracking_no,
              videos (*)
            ),
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
  }) async {
    try {
      final response = await _supabase.functions.invoke(
        'shipments-book',
        body: {
          'order_id': orderId,
          'pickup_address': pickupAddress,
          'pickup_phone': pickupPhone,
          'delivery_address': deliveryAddress,
          'delivery_phone': deliveryPhone,
          'customer_name': customerName,
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

      // TODO: 실제 파일 업로드 구현
      // import 'dart:io';
      // final file = File(filePath);
      // final bytes = await file.readAsBytes();
      // final fileName = '${user.id}_${DateTime.now().millisecondsSinceEpoch}.jpg';
      // final path = 'orders/$fileName';
      // await _supabase.storage.from('images-public').uploadBinary(path, bytes);
      
      // Mock: 현재는 filePath를 그대로 반환
      return filePath;
    } catch (e) {
      throw Exception('이미지 업로드 실패: $e');
    }
  }
}

