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
  Future<List<Map<String, dynamic>>> getPaymentMethods() async {
    try {
      // 🔒 보안: 현재 로그인 사용자의 userId 자동 조회
      final userId = await _getCurrentUserId();
      if (userId == null) {
        throw Exception('로그인이 필요합니다');
      }

      // 🔒 보안: userId 필터링 강제 (본인 결제수단만)
      final data = await _supabase
          .from('payment_methods')
          .select()
          .eq('user_id', userId)  // 🔒 핵심: 본인 결제수단만!
          .eq('is_active', true)
          .order('is_default', ascending: false)
          .order('created_at', ascending: false);

      // Supabase 응답을 올바르게 캐스팅
      return (data as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    } catch (e) {
      throw Exception('결제수단 조회 실패: $e');
    }
  }

  /// 결제수단 등록
  Future<Map<String, dynamic>> registerPaymentMethod({
    required String billingKey,
    required String cardCompany,
    required String cardNumber,
    required String cardType,
    bool isDefault = false,
  }) async {
    try {
      // 🔒 보안: 현재 로그인 사용자의 userId 자동 조회
      final userId = await _getCurrentUserId();
      if (userId == null) {
        throw Exception('로그인이 필요합니다');
      }

      final data = await _supabase.from('payment_methods').insert({
        'user_id': userId,  // 🔒 핵심: 본인 userId만!
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
      // 🔒 보안: 소유자 검증
      final userId = await _getCurrentUserId();
      if (userId == null) {
        throw Exception('로그인이 필요합니다');
      }

      // 🔒 보안: userId 필터링 추가 (본인 결제수단만 삭제 가능)
      await _supabase
          .from('payment_methods')
          .update({'is_active': false})
          .eq('id', paymentMethodId)
          .eq('user_id', userId);  // 🔒 핵심: 본인 결제수단만!
    } catch (e) {
      throw Exception('결제수단 삭제 실패: $e');
    }
  }

  /// 기본 결제수단 설정
  Future<void> setDefaultPaymentMethod({
    required String paymentMethodId,
  }) async {
    try {
      // 🔒 보안: 소유자 검증
      final userId = await _getCurrentUserId();
      if (userId == null) {
        throw Exception('로그인이 필요합니다');
      }

      // 모든 결제수단의 기본 설정 해제
      await _supabase
          .from('payment_methods')
          .update({'is_default': false})
          .eq('user_id', userId);

      // 🔒 보안: userId 필터링 추가 (본인 결제수단만 수정 가능)
      await _supabase
          .from('payment_methods')
          .update({'is_default': true})
          .eq('id', paymentMethodId)
          .eq('user_id', userId);  // 🔒 핵심: 본인 결제수단만!
    } catch (e) {
      throw Exception('기본 결제수단 설정 실패: $e');
    }
  }

  /// 결제 내역 조회 (orders 기반으로 조회)
  Future<List<Map<String, dynamic>>> getPaymentHistory() async {
    try {
      final authId = _supabase.auth.currentUser?.id;
      if (authId == null) {
        throw Exception('로그인이 필요합니다');
      }

      final userRow = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', authId)
          .maybeSingle();

      List<Map<String, dynamic>> rows = [];

      // 1차: 내부 user_id로 조회 (결제완료 + 취소/환불 포함)
      if (userRow != null) {
        final userId = userRow['id'] as String;
        final data = await _supabase
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .or('payment_status.eq.PAID,payment_status.eq.CANCELED,payment_status.eq.PARTIAL_CANCELED,payment_status.eq.REFUNDED')
            .order('created_at', ascending: false);
        rows = (data as List<dynamic>)
            .map((e) => e as Map<String, dynamic>)
            .toList();
      }

      // 2차: 구버전 데이터 — user_id 컬럼에 auth.uid()가 직접 저장된 경우
      if (rows.isEmpty) {
        final data2 = await _supabase
            .from('orders')
            .select('*')
            .eq('user_id', authId)
            .or('payment_status.eq.PAID,payment_status.eq.CANCELED,payment_status.eq.PARTIAL_CANCELED,payment_status.eq.REFUNDED')
            .order('created_at', ascending: false);
        rows = (data2 as List<dynamic>)
            .map((e) => e as Map<String, dynamic>)
            .toList();
      }

      return rows;
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

  /// 추가 결제 목록 조회
  Future<List<Map<String, dynamic>>> getAdditionalPayments(String orderId) async {
    try {
      // 🔒 보안: 소유자 검증 (해당 주문이 본인 소유인지 확인)
      final userId = await _getCurrentUserId();
      if (userId == null) {
        throw Exception('로그인이 필요합니다');
      }

      // 먼저 주문이 본인 소유인지 검증
      final order = await _supabase
          .from('orders')
          .select('id, user_id')
          .eq('id', orderId)
          .eq('user_id', userId)  // 🔒 핵심: 본인 주문만!
          .maybeSingle();

      if (order == null) {
        throw Exception('접근 권한이 없습니다. 본인의 주문만 조회할 수 있습니다.');
      }

      final data = await _supabase
          .from('additional_payments')
          .select()
          .eq('order_id', orderId)
          .order('created_at', ascending: false);

      // Supabase 응답을 올바르게 캐스팅
      return (data as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    } catch (e) {
      throw Exception('추가 결제 조회 실패: $e');
    }
  }

  /// 추가 결제 수락 (고객)
  Future<Map<String, dynamic>> acceptAdditionalPayment({
    required String additionalPaymentId,
  }) async {
    try {
      // 🔒 보안: 소유자 검증
      final userId = await _getCurrentUserId();
      if (userId == null) {
        throw Exception('로그인이 필요합니다');
      }

      // 추가 결제 정보 조회 및 소유자 검증
      final additionalPayment = await _supabase
          .from('additional_payments')
          .select('*, order_id')
          .eq('id', additionalPaymentId)
          .single();

      // 해당 주문이 본인 소유인지 확인
      final order = await _supabase
          .from('orders')
          .select('id, user_id')
          .eq('id', additionalPayment['order_id'])
          .eq('user_id', userId)  // 🔒 핵심: 본인 주문만!
          .maybeSingle();

      if (order == null) {
        throw Exception('접근 권한이 없습니다. 본인의 주문만 수락할 수 있습니다.');
      }

      // 상태 업데이트 (고객 수락)
      await _supabase
          .from('additional_payments')
          .update({
            'customer_response_at': DateTime.now().toIso8601String(),
          })
          .eq('id', additionalPaymentId);

      return additionalPayment;
    } catch (e) {
      throw Exception('추가 결제 수락 실패: $e');
    }
  }

  /// 추가 결제 거부 (고객)
  Future<void> rejectAdditionalPayment({
    required String additionalPaymentId,
  }) async {
    try {
      // 🔒 보안: 소유자 검증
      final userId = await _getCurrentUserId();
      if (userId == null) {
        throw Exception('로그인이 필요합니다');
      }

      // 추가 결제 정보 조회 및 소유자 검증
      final additionalPayment = await _supabase
          .from('additional_payments')
          .select('order_id')
          .eq('id', additionalPaymentId)
          .single();

      // 해당 주문이 본인 소유인지 확인
      final order = await _supabase
          .from('orders')
          .select('id, user_id')
          .eq('id', additionalPayment['order_id'])
          .eq('user_id', userId)  // 🔒 핵심: 본인 주문만!
          .maybeSingle();

      if (order == null) {
        throw Exception('접근 권한이 없습니다. 본인의 주문만 거부할 수 있습니다.');
      }

      await _supabase
          .from('additional_payments')
          .update({
            'status': 'REJECTED',
            'customer_response_at': DateTime.now().toIso8601String(),
          })
          .eq('id', additionalPaymentId);
    } catch (e) {
      throw Exception('추가 결제 거부 실패: $e');
    }
  }

  /// 토스페이먼츠 결제 승인 (결제위젯 사용)
  /// 
  /// 결제위젯에서 결제 성공 후 서버에 승인 요청
  Future<Map<String, dynamic>> confirmTossPayment({
    required String paymentKey,
    required String orderId,
    required int amount,
    bool isExtraCharge = false,
    String? originalOrderId, // 추가 결제 시 원본 주문 ID
    bool triggerIntentFlow = false, // 신규 흐름: payment_intents 기반
  }) async {
    try {
      final response = await _supabase.functions.invoke(
        'payments-confirm-toss',
        body: {
          'payment_key': paymentKey,
          'order_id': orderId,
          'amount': amount,
          'is_extra_charge': isExtraCharge,
          if (originalOrderId != null) 'original_order_id': originalOrderId,
          // pickup_payload 가 있으면 edge function 이 신규 흐름으로 분기.
          // 실제 픽업 정보는 인텐트에 이미 저장되어 있으므로 트리거만 보낸다.
          if (triggerIntentFlow) 'pickup_payload': {'__from_intent': true},
        },
      );

      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? '결제 승인 실패');
      }

      return response.data['data'];
    } catch (e) {
      throw Exception('결제 승인 실패: $e');
    }
  }

  /// 추가 결제 요청 조회 (대기 중인 결제)
  Future<Map<String, dynamic>?> getPendingExtraChargeRequest(String orderId) async {
    try {
      final response = await _supabase
          .from('extra_charge_requests')
          .select('*')
          .eq('order_id', orderId)
          .eq('status', 'PENDING_PAYMENT')
          .order('created_at', ascending: false)
          .limit(1)
          .maybeSingle();

      return response;
    } catch (e) {
      throw Exception('추가 결제 요청 조회 실패: $e');
    }
  }

  /// 현재 사용자의 user_id 가져오기
  Future<String?> _getCurrentUserId() async {
    try {
      final authId = _supabase.auth.currentUser?.id;
      if (authId == null) {
        return null;
      }

      final response = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', authId)
          .maybeSingle();

      return response?['id'] as String?;
    } catch (e) {
      return null;
    }
  }
}

