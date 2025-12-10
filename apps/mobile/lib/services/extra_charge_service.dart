import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/enums/extra_charge_status.dart';
import '../features/orders/domain/models/extra_charge_data.dart';

/// 추가 과금(Extra Charge) 서비스
class ExtraChargeService {
  final _supabase = Supabase.instance.client;

  /// [스마트 요청 기능] 추가 작업 요청
  /// 
  /// 호출자의 Role에 따라 로직이 분기됨:
  /// - WORKER: memo만 입력, 관리자 승인 대기 (PENDING_MANAGER)
  /// - MANAGER/ADMIN: memo + price + note 입력, 즉시 고객에게 전달 (PENDING_CUSTOMER)
  Future<Map<String, dynamic>> requestExtraWork({
    required String orderId,
    required String memo,
    int? price,
    String? note,
  }) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('로그인이 필요합니다');
      }

      debugPrint('📋 추가 작업 요청 시작');
      debugPrint('   Order ID: $orderId');
      debugPrint('   Memo: $memo');
      debugPrint('   Price: $price');

      // public.users 테이블에서 실제 user_id 조회
      final userResponse = await _supabase
          .from('users')
          .select('id, role')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (userResponse == null) {
        throw Exception('사용자 정보를 찾을 수 없습니다');
      }

      final userId = userResponse['id'] as String;
      final userRole = userResponse['role'] as String;

      debugPrint('✅ User ID: $userId, Role: $userRole');

      // RPC 함수 호출
      final response = await _supabase.rpc('request_extra_charge', params: {
        'p_order_id': orderId,
        'p_user_id': userId,
        'p_memo': memo,
        'p_price': price,
        'p_note': note,
      });

      debugPrint('✅ 추가 작업 요청 성공: $response');
      
      return Map<String, dynamic>.from(response as Map);
    } on PostgrestException catch (e) {
      debugPrint('❌ PostgrestException: ${e.message}');
      throw Exception('추가 작업 요청 실패: ${e.message}');
    } catch (e) {
      debugPrint('❌ 추가 작업 요청 오류: $e');
      throw Exception('추가 작업 요청 실패: $e');
    }
  }

  /// [관리자 승인 기능] 작업자의 요청을 승인
  /// 
  /// 대상: PENDING_MANAGER 상태인 주문
  Future<Map<String, dynamic>> approveWorkerRequest({
    required String orderId,
    required int price,
    required String note,
  }) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('로그인이 필요합니다');
      }

      debugPrint('📋 관리자 승인 시작');
      debugPrint('   Order ID: $orderId');
      debugPrint('   Price: $price');
      debugPrint('   Note: $note');

      // public.users 테이블에서 실제 user_id 조회
      final userResponse = await _supabase
          .from('users')
          .select('id, role')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (userResponse == null) {
        throw Exception('사용자 정보를 찾을 수 없습니다');
      }

      final managerId = userResponse['id'] as String;
      final userRole = userResponse['role'] as String;

      if (userRole != 'MANAGER' && userRole != 'ADMIN') {
        throw Exception('관리자 권한이 필요합니다');
      }

      debugPrint('✅ Manager ID: $managerId, Role: $userRole');

      // RPC 함수 호출
      final response = await _supabase.rpc('approve_extra_charge', params: {
        'p_order_id': orderId,
        'p_manager_id': managerId,
        'p_price': price,
        'p_note': note,
      });

      debugPrint('✅ 관리자 승인 성공: $response');
      
      return Map<String, dynamic>.from(response as Map);
    } on PostgrestException catch (e) {
      debugPrint('❌ PostgrestException: ${e.message}');
      throw Exception('승인 실패: ${e.message}');
    } catch (e) {
      debugPrint('❌ 관리자 승인 오류: $e');
      throw Exception('승인 실패: $e');
    }
  }

  /// [고객 결정 기능] 고객의 선택 처리
  /// 
  /// 대상: PENDING_CUSTOMER 상태인 주문
  /// 액션: PAY (결제), SKIP (거절), RETURN (반송)
  Future<Map<String, dynamic>> processCustomerDecision({
    required String orderId,
    required CustomerDecisionAction action,
  }) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('로그인이 필요합니다');
      }

      debugPrint('📋 고객 결정 처리 시작');
      debugPrint('   Order ID: $orderId');
      debugPrint('   Action: ${action.toShortString()}');

      // public.users 테이블에서 실제 user_id 조회
      final userResponse = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (userResponse == null) {
        throw Exception('사용자 정보를 찾을 수 없습니다');
      }

      final customerId = userResponse['id'] as String;
      debugPrint('✅ Customer ID: $customerId');

      // RPC 함수 호출
      final response = await _supabase.rpc('process_customer_decision', params: {
        'p_order_id': orderId,
        'p_action': action.toShortString(),
        'p_customer_id': customerId,
      });

      debugPrint('✅ 고객 결정 처리 성공: $response');
      
      return Map<String, dynamic>.from(response as Map);
    } on PostgrestException catch (e) {
      debugPrint('❌ PostgrestException: ${e.message}');
      throw Exception('처리 실패: ${e.message}');
    } catch (e) {
      debugPrint('❌ 고객 결정 처리 오류: $e');
      throw Exception('처리 실패: $e');
    }
  }

  /// 추가 과금 대기 중인 주문 목록 조회 (관리자용)
  /// 
  /// 상태가 PENDING_MANAGER인 주문들을 조회
  Future<List<Map<String, dynamic>>> getPendingManagerOrders() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('로그인이 필요합니다');
      }

      debugPrint('📋 관리자 승인 대기 주문 조회 시작');

      // public.users 테이블에서 권한 확인
      final userResponse = await _supabase
          .from('users')
          .select('role')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (userResponse == null) {
        throw Exception('사용자 정보를 찾을 수 없습니다');
      }

      final userRole = userResponse['role'] as String;
      if (userRole != 'MANAGER' && userRole != 'ADMIN') {
        throw Exception('관리자 권한이 필요합니다');
      }

      // PENDING_MANAGER 상태인 주문 조회
      final response = await _supabase
          .from('orders')
          .select('*')
          .eq('extra_charge_status', 'PENDING_MANAGER')
          .order('updated_at', ascending: false);

      debugPrint('✅ 조회된 주문 개수: ${(response as List).length}개');

      return (response as List)
          .map((order) => Map<String, dynamic>.from(order as Map))
          .toList();
    } catch (e) {
      debugPrint('❌ 주문 목록 조회 오류: $e');
      throw Exception('주문 목록 조회 실패: $e');
    }
  }

  /// 고객 결제 대기 중인 주문 확인 (고객용)
  /// 
  /// 내 주문 중 PENDING_CUSTOMER 상태인 것이 있는지 확인
  Future<Map<String, dynamic>?> getMyPendingCustomerOrder() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        return null;
      }

      debugPrint('📋 고객 결제 대기 주문 확인');

      // public.users 테이블에서 user_id 조회
      final userResponse = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (userResponse == null) {
        return null;
      }

      final userId = userResponse['id'] as String;

      // PENDING_CUSTOMER 상태이면서 본인 주문인 것 조회
      final response = await _supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .eq('extra_charge_status', 'PENDING_CUSTOMER')
          .maybeSingle();

      if (response == null) {
        debugPrint('⚠️ 결제 대기 중인 주문 없음');
        return null;
      }

      debugPrint('✅ 결제 대기 중인 주문 발견: ${response['id']}');
      return Map<String, dynamic>.from(response as Map);
    } catch (e) {
      debugPrint('❌ 주문 확인 오류: $e');
      return null;
    }
  }

  /// 특정 주문의 추가 과금 정보 조회
  Future<ExtraChargeData> getExtraChargeData(String orderId) async {
    try {
      final response = await _supabase
          .from('orders')
          .select('extra_charge_data')
          .eq('id', orderId)
          .maybeSingle();

      if (response == null || response['extra_charge_data'] == null) {
        return ExtraChargeData.empty;
      }

      final data = Map<String, dynamic>.from(response['extra_charge_data'] as Map);
      return ExtraChargeData.fromJson(data);
    } catch (e) {
      debugPrint('❌ 추가 과금 정보 조회 오류: $e');
      return ExtraChargeData.empty;
    }
  }
}

