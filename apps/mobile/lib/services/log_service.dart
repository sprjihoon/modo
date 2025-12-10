import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/enums/action_type.dart';

/// Action Log 서비스 (싱글톤)
/// KPI 분석 및 감사(Audit) 추적을 위한 사용자 액션 로깅
class LogService {
  // 싱글톤 인스턴스
  static final LogService _instance = LogService._internal();
  
  factory LogService() => _instance;
  
  LogService._internal();

  final _supabase = Supabase.instance.client;

  /// 액션 로그 기록
  /// 
  /// [actionType] 액션 타입 (LOGIN, WORK_START 등)
  /// [targetId] 대상 주문 ID 또는 사용자 ID (선택사항)
  /// [metadata] 추가 정보 Map (예: {"oldStatus": "PENDING", "newStatus": "INBOUND"})
  Future<void> log({
    required ActionType actionType,
    String? targetId,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      // 1. 현재 로그인한 사용자 정보 가져오기
      final currentUser = _supabase.auth.currentUser;
      if (currentUser == null) {
        print('⚠️ LogService: 로그인하지 않은 사용자 - 로그 기록 건너뜀');
        return;
      }

      // 2. public.users 테이블에서 사용자 프로필 조회
      final userProfile = await _supabase
          .from('users')
          .select('id, name, role')
          .eq('auth_id', currentUser.id)
          .maybeSingle();

      if (userProfile == null) {
        print('⚠️ LogService: 사용자 프로필을 찾을 수 없음 - 로그 기록 건너뜀');
        return;
      }

      final actorId = userProfile['id'] as String;
      final actorName = userProfile['name'] as String;
      final actorRole = userProfile['role'] as String;

      // 3. action_logs 테이블에 로그 저장
      final logData = {
        'actor_id': actorId,
        'actor_name': actorName,
        'actor_role': actorRole,
        'action_type': actionType.toShortString(),
        'target_id': targetId,
        'metadata': metadata ?? {},
        'timestamp': DateTime.now().toUtc().toIso8601String(),
      };

      await _supabase.from('action_logs').insert(logData);

      print('✅ LogService: 로그 기록 완료 - ${actionType.displayName} by $actorName ($actorRole)');
      
      if (targetId != null) {
        print('   🎯 Target: $targetId');
      }
      
      if (metadata != null && metadata.isNotEmpty) {
        print('   📝 Metadata: $metadata');
      }
    } catch (e) {
      // 로그 기록 실패해도 앱 동작에 영향을 주지 않도록 에러 무시
      print('❌ LogService: 로그 기록 실패 (무시됨) - $e');
    }
  }

  /// 특정 사용자의 로그 조회
  /// 
  /// [userId] 조회할 사용자 ID (null이면 현재 로그인한 사용자)
  /// [limit] 조회할 로그 개수 (기본값: 100)
  Future<List<Map<String, dynamic>>> getLogsByUser({
    String? userId,
    int limit = 100,
  }) async {
    try {
      final currentUser = _supabase.auth.currentUser;
      if (currentUser == null) {
        throw Exception('로그인이 필요합니다');
      }

      // userId가 없으면 현재 사용자의 ID 사용
      String targetUserId;
      if (userId == null) {
        final userProfile = await _supabase
            .from('users')
            .select('id')
            .eq('auth_id', currentUser.id)
            .single();
        targetUserId = userProfile['id'] as String;
      } else {
        targetUserId = userId;
      }

      final response = await _supabase
          .from('action_logs')
          .select('*')
          .eq('actor_id', targetUserId)
          .order('timestamp', ascending: false)
          .limit(limit);

      return (response as List).map((log) => Map<String, dynamic>.from(log)).toList();
    } catch (e) {
      print('❌ LogService: 로그 조회 실패 - $e');
      return [];
    }
  }

  /// 특정 주문/대상의 로그 조회
  /// 
  /// [targetId] 조회할 대상 ID (주문 ID 등)
  /// [limit] 조회할 로그 개수 (기본값: 100)
  Future<List<Map<String, dynamic>>> getLogsByTarget({
    required String targetId,
    int limit = 100,
  }) async {
    try {
      final response = await _supabase
          .from('action_logs')
          .select('*')
          .eq('target_id', targetId)
          .order('timestamp', ascending: false)
          .limit(limit);

      return (response as List).map((log) => Map<String, dynamic>.from(log)).toList();
    } catch (e) {
      print('❌ LogService: 대상 로그 조회 실패 - $e');
      return [];
    }
  }

  /// 특정 액션 타입의 로그 조회
  /// 
  /// [actionType] 조회할 액션 타입
  /// [limit] 조회할 로그 개수 (기본값: 100)
  Future<List<Map<String, dynamic>>> getLogsByActionType({
    required ActionType actionType,
    int limit = 100,
  }) async {
    try {
      final response = await _supabase
          .from('action_logs')
          .select('*')
          .eq('action_type', actionType.toShortString())
          .order('timestamp', ascending: false)
          .limit(limit);

      return (response as List).map((log) => Map<String, dynamic>.from(log)).toList();
    } catch (e) {
      print('❌ LogService: 액션 타입별 로그 조회 실패 - $e');
      return [];
    }
  }

  /// 날짜 범위로 로그 조회
  /// 
  /// [startDate] 시작 날짜
  /// [endDate] 종료 날짜
  /// [limit] 조회할 로그 개수 (기본값: 1000)
  Future<List<Map<String, dynamic>>> getLogsByDateRange({
    required DateTime startDate,
    required DateTime endDate,
    int limit = 1000,
  }) async {
    try {
      final response = await _supabase
          .from('action_logs')
          .select('*')
          .gte('timestamp', startDate.toUtc().toIso8601String())
          .lte('timestamp', endDate.toUtc().toIso8601String())
          .order('timestamp', ascending: false)
          .limit(limit);

      return (response as List).map((log) => Map<String, dynamic>.from(log)).toList();
    } catch (e) {
      print('❌ LogService: 날짜 범위 로그 조회 실패 - $e');
      return [];
    }
  }

  /// 모든 로그 조회 (ADMIN 전용)
  /// 
  /// [limit] 조회할 로그 개수 (기본값: 100)
  Future<List<Map<String, dynamic>>> getAllLogs({
    int limit = 100,
  }) async {
    try {
      final response = await _supabase
          .from('action_logs')
          .select('*')
          .order('timestamp', ascending: false)
          .limit(limit);

      return (response as List).map((log) => Map<String, dynamic>.from(log)).toList();
    } catch (e) {
      print('❌ LogService: 전체 로그 조회 실패 - $e');
      return [];
    }
  }

  /// 오늘 나의 성과 조회 (작업자용)
  /// 
  /// 현재 로그인한 사용자의 오늘 작업 완료 건수를 반환합니다.
  /// [includeAllActions] true면 모든 액션 포함, false면 WORK_COMPLETE만
  Future<Map<String, int>> getMyTodayPerformance({
    bool includeAllActions = false,
  }) async {
    try {
      final currentUser = _supabase.auth.currentUser;
      if (currentUser == null) {
        return {
          'workComplete': 0,
          'scanInbound': 0,
          'scanOutbound': 0,
          'extraChargeRequest': 0,
        };
      }

      // 현재 사용자 프로필 조회
      final userProfile = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', currentUser.id)
          .maybeSingle();

      if (userProfile == null) {
        return {
          'workComplete': 0,
          'scanInbound': 0,
          'scanOutbound': 0,
          'extraChargeRequest': 0,
        };
      }

      final actorId = userProfile['id'] as String;

      // 오늘 00:00:00부터 현재까지
      final today = DateTime.now();
      final startOfDay = DateTime(today.year, today.month, today.day);

      // 오늘의 로그 조회
      final response = await _supabase
          .from('action_logs')
          .select('action_type')
          .eq('actor_id', actorId)
          .gte('timestamp', startOfDay.toUtc().toIso8601String())
          .lte('timestamp', DateTime.now().toUtc().toIso8601String());

      final logs = (response as List).map((log) => Map<String, dynamic>.from(log)).toList();

      // 액션별 집계
      int workComplete = 0;
      int scanInbound = 0;
      int scanOutbound = 0;
      int extraChargeRequest = 0;

      for (final log in logs) {
        final actionType = log['action_type'] as String?;
        switch (actionType) {
          case 'WORK_COMPLETE':
            workComplete++;
            break;
          case 'SCAN_INBOUND':
            scanInbound++;
            break;
          case 'SCAN_OUTBOUND':
            scanOutbound++;
            break;
          case 'REQ_EXTRA_CHARGE':
            extraChargeRequest++;
            break;
        }
      }

      print('✅ LogService: 오늘의 성과 조회 완료 - 작업 완료: $workComplete건');

      return {
        'workComplete': workComplete,
        'scanInbound': scanInbound,
        'scanOutbound': scanOutbound,
        'extraChargeRequest': extraChargeRequest,
      };
    } catch (e) {
      print('❌ LogService: 오늘의 성과 조회 실패 - $e');
      return {
        'workComplete': 0,
        'scanInbound': 0,
        'scanOutbound': 0,
        'extraChargeRequest': 0,
      };
    }
  }

  /// 이번 주 나의 성과 조회
  Future<Map<String, int>> getMyWeekPerformance() async {
    try {
      final currentUser = _supabase.auth.currentUser;
      if (currentUser == null) {
        return {'workComplete': 0, 'scanInbound': 0, 'scanOutbound': 0};
      }

      final userProfile = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', currentUser.id)
          .maybeSingle();

      if (userProfile == null) {
        return {'workComplete': 0, 'scanInbound': 0, 'scanOutbound': 0};
      }

      final actorId = userProfile['id'] as String;

      // 이번 주 월요일 00:00:00부터
      final now = DateTime.now();
      final weekday = now.weekday;
      final startOfWeek = DateTime(now.year, now.month, now.day - weekday + 1);

      final response = await _supabase
          .from('action_logs')
          .select('action_type')
          .eq('actor_id', actorId)
          .gte('timestamp', startOfWeek.toUtc().toIso8601String())
          .lte('timestamp', DateTime.now().toUtc().toIso8601String());

      final logs = (response as List).map((log) => Map<String, dynamic>.from(log)).toList();

      int workComplete = 0;
      int scanInbound = 0;
      int scanOutbound = 0;

      for (final log in logs) {
        final actionType = log['action_type'] as String?;
        switch (actionType) {
          case 'WORK_COMPLETE':
            workComplete++;
            break;
          case 'SCAN_INBOUND':
            scanInbound++;
            break;
          case 'SCAN_OUTBOUND':
            scanOutbound++;
            break;
        }
      }

      return {
        'workComplete': workComplete,
        'scanInbound': scanInbound,
        'scanOutbound': scanOutbound,
      };
    } catch (e) {
      print('❌ LogService: 이번 주 성과 조회 실패 - $e');
      return {'workComplete': 0, 'scanInbound': 0, 'scanOutbound': 0};
    }
  }
}

