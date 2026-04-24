import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/enums/extra_charge_status.dart';
import '../core/enums/action_type.dart';
import '../features/orders/domain/models/extra_charge_data.dart';
import 'log_service.dart';

/// 추가 과금(Extra Charge) 서비스
class ExtraChargeService {
  final _supabase = Supabase.instance.client;
  final _logService = LogService();

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
      
      // 📊 추가과금 요청 액션 로그 기록
      await _logService.log(
        actionType: ActionType.REQ_EXTRA_CHARGE,
        targetId: orderId,
        metadata: {
          'memo': memo,
          if (price != null) 'price': price,
          if (note != null) 'note': note,
          'userRole': userRole,
        },
      );
      
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
      
      // 📊 추가과금 승인 액션 로그 기록
      await _logService.log(
        actionType: ActionType.APPROVE_EXTRA,
        targetId: orderId,
        metadata: {
          'price': price,
          'note': note,
          'managerId': managerId,
        },
      );
      
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
  /// 액션:
  ///   - PAY    → RPC `process_customer_decision` (결제 페이지로 진행)
  ///   - SKIP   → RPC `process_customer_decision` (그냥 진행)
  ///   - RETURN → Edge Function `orders-return-and-refund` 호출
  ///              (RPC 상태 전이 + Toss 부분환불을 한 트랜잭션처럼 처리.
  ///               환불액 = total_price - returnFee - orders.remote_area_fee)
  ///
  /// "들어온 건 나가야 한다"는 정책으로 도서산간 비용은 결제 시 이미 왕복(편도×2)
  /// 으로 저장되어 있고, 반송 시에도 동일한 왕복 금액이 차감된다.
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

      Map<String, dynamic> result;

      if (action == CustomerDecisionAction.RETURN) {
        // 반송 → 부분환불까지 함께 처리하는 Edge Function 호출.
        // (웹의 /api/orders/[id]/return-and-refund 와 동일한 로직 미러링)
        debugPrint('🔁 orders-return-and-refund Edge Function 호출');
        final response = await _supabase.functions.invoke(
          'orders-return-and-refund',
          body: {'order_id': orderId},
        );

        if (response.data == null) {
          throw Exception('반송 처리 응답이 비어있습니다');
        }
        final data = Map<String, dynamic>.from(response.data as Map);
        if (data['success'] != true) {
          throw Exception(
            (data['error'] as String?) ?? '반송 처리 실패',
          );
        }
        result = data;
      } else {
        // PAY / SKIP → 기존처럼 RPC 만 호출
        final response = await _supabase.rpc('process_customer_decision', params: {
          'p_order_id': orderId,
          'p_action': action.toShortString(),
          'p_customer_id': customerId,
        });
        result = Map<String, dynamic>.from(response as Map);
      }

      debugPrint('✅ 고객 결정 처리 성공: $result');

      // 📊 고객 결정 액션 로그 기록 (거부 시 REJECT_EXTRA)
      if (action == CustomerDecisionAction.SKIP || action == CustomerDecisionAction.RETURN) {
        await _logService.log(
          actionType: ActionType.REJECT_EXTRA,
          targetId: orderId,
          metadata: {
            'action': action.toShortString(),
            'customerId': customerId,
            if (action == CustomerDecisionAction.RETURN) ...{
              'returnFee': result['returnFee'],
              'remoteAreaFee': result['remoteAreaFee'],
              'totalDeduction': result['totalDeduction'],
              'refundAmount': result['refundAmount'],
              'refundProcessed': result['refundProcessed'],
            },
          },
        );
      }

      return result;
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

