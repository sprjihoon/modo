import 'package:supabase_flutter/supabase_flutter.dart';

/// 토스페이먼츠 결제 서비스
class PaymentService {
  final _supabase = Supabase.instance.client;
  
  // 토스페이먼츠 API 키 (환경변수에서 로드)
  // final String _clientKey = const String.fromEnvironment('TOSS_CLIENT_KEY');
  // final String _secretKey = const String.fromEnvironment('TOSS_SECRET_KEY');
  
  /// 빌링키 발급 (카드 등록)
  /// 
  /// 사용자가 카드를 등록하면 토스페이먼츠에서 빌링키를 발급받습니다.
  /// 이 빌링키로 나중에 반복 결제가 가능합니다.
  Future<Map<String, dynamic>> issueBillingKey({
    required String customerId,
    required String cardNumber,
    required String expiryYear,
    required String expiryMonth,
    required String cardPassword,
    required String identityNumber,
    String? customerName,
  }) async {
    try {
      // Edge Function을 통해 토스페이먼츠 API 호출
      final response = await _supabase.functions.invoke(
        'payments-issue-billing-key',
        body: {
          'customer_id': customerId,
          'card_number': cardNumber,
          'expiry_year': expiryYear,
          'expiry_month': expiryMonth,
          'card_password': cardPassword,
          'identity_number': identityNumber,
          'customer_name': customerName,
        },
      );

      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? '빌링키 발급 실패');
      }

      return response.data['data'];
    } catch (e) {
      throw Exception('빌링키 발급 실패: $e');
    }
  }

  /// 빌링키로 결제하기
  /// 
  /// 등록된 빌링키를 사용하여 결제를 진행합니다.
  Future<Map<String, dynamic>> payWithBillingKey({
    required String billingKey,
    required String orderId,
    required int amount,
    required String orderName,
  }) async {
    try {
      final response = await _supabase.functions.invoke(
        'payments-billing-payment',
        body: {
          'billing_key': billingKey,
          'order_id': orderId,
          'amount': amount,
          'order_name': orderName,
        },
      );

      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? '결제 실패');
      }

      return response.data['data'];
    } catch (e) {
      throw Exception('결제 실패: $e');
    }
  }

  /// 등록된 결제수단 목록 조회
  Future<List<Map<String, dynamic>>> getPaymentMethods(String userId) async {
    try {
      final data = await _supabase
          .from('payment_methods')
          .select()
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('is_default', ascending: false)
          .order('created_at', ascending: false);

      return List<Map<String, dynamic>>.from(data);
    } catch (e) {
      throw Exception('결제수단 조회 실패: $e');
    }
  }

  /// 결제수단 등록
  Future<Map<String, dynamic>> registerPaymentMethod({
    required String userId,
    required String billingKey,
    required String cardCompany,
    required String cardNumber,
    required String cardType,
    bool isDefault = false,
  }) async {
    try {
      final data = await _supabase.from('payment_methods').insert({
        'user_id': userId,
        'billing_key': billingKey,
        'card_company': cardCompany,
        'card_number': cardNumber,
        'card_type': cardType,
        'is_default': isDefault,
        'is_active': true,
      }).select().single();

      // 기본 결제수단으로 설정한 경우, 다른 결제수단의 기본 설정 해제
      if (isDefault) {
        await _supabase
            .from('payment_methods')
            .update({'is_default': false})
            .eq('user_id', userId)
            .neq('id', data['id']);
      }

      return data;
    } catch (e) {
      throw Exception('결제수단 등록 실패: $e');
    }
  }

  /// 결제수단 삭제
  Future<void> deletePaymentMethod(String paymentMethodId) async {
    try {
      await _supabase
          .from('payment_methods')
          .update({'is_active': false})
          .eq('id', paymentMethodId);
    } catch (e) {
      throw Exception('결제수단 삭제 실패: $e');
    }
  }

  /// 기본 결제수단 설정
  Future<void> setDefaultPaymentMethod({
    required String userId,
    required String paymentMethodId,
  }) async {
    try {
      // 모든 결제수단의 기본 설정 해제
      await _supabase
          .from('payment_methods')
          .update({'is_default': false})
          .eq('user_id', userId);

      // 선택한 결제수단을 기본으로 설정
      await _supabase
          .from('payment_methods')
          .update({'is_default': true})
          .eq('id', paymentMethodId);
    } catch (e) {
      throw Exception('기본 결제수단 설정 실패: $e');
    }
  }

  /// 결제 내역 조회 (orders 기반으로 조회)
  Future<List<Map<String, dynamic>>> getPaymentHistory(String userId) async {
    try {
      // payments 테이블 대신 orders 테이블에서 결제 완료된 주문 조회
      final data = await _supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .eq('payment_status', 'PAID')
          .order('created_at', ascending: false);

      return List<Map<String, dynamic>>.from(data);
    } catch (e) {
      throw Exception('결제 내역 조회 실패: $e');
    }
  }

  /// 결제 취소
  Future<Map<String, dynamic>> cancelPayment({
    required String paymentKey,
    required String cancelReason,
    int? cancelAmount,
  }) async {
    try {
      final response = await _supabase.functions.invoke(
        'payments-cancel',
        body: {
          'payment_key': paymentKey,
          'cancel_reason': cancelReason,
          if (cancelAmount != null) 'cancel_amount': cancelAmount,
        },
      );

      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? '결제 취소 실패');
      }

      return response.data['data'];
    } catch (e) {
      throw Exception('결제 취소 실패: $e');
    }
  }
}

