import { supabase } from '../supabase'
import { ActionType, ActionLog } from '../types/action-log'

/**
 * Action Log 서비스
 * KPI 분석 및 감사(Audit) 추적을 위한 사용자 액션 로깅
 */
class LogService {
  private static instance: LogService;

  private constructor() {}

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): LogService {
    if (!LogService.instance) {
      LogService.instance = new LogService();
    }
    return LogService.instance;
  }

  /**
   * 액션 로그 기록
   * 
   * @param actionType 액션 타입 (LOGIN, WORK_START 등)
   * @param targetId 대상 주문 ID 또는 사용자 ID (선택사항)
   * @param metadata 추가 정보 객체
   */
  async log(
    actionType: ActionType,
    targetId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // 1. 현재 로그인한 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('⚠️ LogService: 로그인하지 않은 사용자 - 로그 기록 건너뜀');
        return;
      }

      // 2. public.users 테이블에서 사용자 프로필 조회
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (profileError || !userProfile) {
        console.warn('⚠️ LogService: 사용자 프로필을 찾을 수 없음 - 로그 기록 건너뜀', profileError);
        return;
      }

      const actorId = userProfile.id;
      const actorName = userProfile.name;
      const actorRole = userProfile.role;

      // 3. action_logs 테이블에 로그 저장
      const logData = {
        actor_id: actorId,
        actor_name: actorName,
        actor_role: actorRole,
        action_type: actionType,
        target_id: targetId,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('action_logs')
        .insert(logData);

      if (insertError) {
        throw insertError;
      }

      console.log(`✅ LogService: 로그 기록 완료 - ${actionType} by ${actorName} (${actorRole})`);
      
      if (targetId) {
        console.log(`   🎯 Target: ${targetId}`);
      }
      
      if (metadata && Object.keys(metadata).length > 0) {
        console.log(`   📝 Metadata:`, metadata);
      }
    } catch (error) {
      // 로그 기록 실패해도 앱 동작에 영향을 주지 않도록 에러 무시
      console.error('❌ LogService: 로그 기록 실패 (무시됨)', error);
    }
  }

  /**
   * 특정 사용자의 로그 조회
   * 
   * @param userId 조회할 사용자 ID (null이면 현재 로그인한 사용자)
   * @param limit 조회할 로그 개수 (기본값: 100)
   */
  async getLogsByUser(userId?: string, limit: number = 100): Promise<ActionLog[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('로그인이 필요합니다');
      }

      // userId가 없으면 현재 사용자의 ID 사용
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .single();
        
        if (!userProfile) {
          throw new Error('사용자 정보를 찾을 수 없습니다');
        }
        
        targetUserId = userProfile.id;
      }

      const { data, error } = await supabase
        .from('action_logs')
        .select('*')
        .eq('actor_id', targetUserId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as ActionLog[];
    } catch (error) {
      console.error('❌ LogService: 로그 조회 실패', error);
      return [];
    }
  }

  /**
   * 특정 주문/대상의 로그 조회
   * 
   * @param targetId 조회할 대상 ID (주문 ID 등)
   * @param limit 조회할 로그 개수 (기본값: 100)
   */
  async getLogsByTarget(targetId: string, limit: number = 100): Promise<ActionLog[]> {
    try {
      const { data, error } = await supabase
        .from('action_logs')
        .select('*')
        .eq('target_id', targetId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as ActionLog[];
    } catch (error) {
      console.error('❌ LogService: 대상 로그 조회 실패', error);
      return [];
    }
  }

  /**
   * 특정 액션 타입의 로그 조회
   * 
   * @param actionType 조회할 액션 타입
   * @param limit 조회할 로그 개수 (기본값: 100)
   */
  async getLogsByActionType(actionType: ActionType, limit: number = 100): Promise<ActionLog[]> {
    try {
      const { data, error } = await supabase
        .from('action_logs')
        .select('*')
        .eq('action_type', actionType)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as ActionLog[];
    } catch (error) {
      console.error('❌ LogService: 액션 타입별 로그 조회 실패', error);
      return [];
    }
  }

  /**
   * 날짜 범위로 로그 조회
   * 
   * @param startDate 시작 날짜
   * @param endDate 종료 날짜
   * @param limit 조회할 로그 개수 (기본값: 1000)
   */
  async getLogsByDateRange(
    startDate: Date,
    endDate: Date,
    limit: number = 1000
  ): Promise<ActionLog[]> {
    try {
      const { data, error } = await supabase
        .from('action_logs')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as ActionLog[];
    } catch (error) {
      console.error('❌ LogService: 날짜 범위 로그 조회 실패', error);
      return [];
    }
  }

  /**
   * 모든 로그 조회 (ADMIN 전용)
   * 
   * @param limit 조회할 로그 개수 (기본값: 100)
   */
  async getAllLogs(limit: number = 100): Promise<ActionLog[]> {
    try {
      const { data, error } = await supabase
        .from('action_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as ActionLog[];
    } catch (error) {
      console.error('❌ LogService: 전체 로그 조회 실패', error);
      return [];
    }
  }
}

// 싱글톤 인스턴스 export
export const logService = LogService.getInstance();

// 편의 함수들 export
export const logAction = (
  actionType: ActionType,
  targetId?: string,
  metadata?: Record<string, any>
) => logService.log(actionType, targetId, metadata);

export const getLogsByUser = (userId?: string, limit?: number) => 
  logService.getLogsByUser(userId, limit);

export const getLogsByTarget = (targetId: string, limit?: number) => 
  logService.getLogsByTarget(targetId, limit);

export const getLogsByActionType = (actionType: ActionType, limit?: number) => 
  logService.getLogsByActionType(actionType, limit);

export const getLogsByDateRange = (startDate: Date, endDate: Date, limit?: number) => 
  logService.getLogsByDateRange(startDate, endDate, limit);

export const getAllLogs = (limit?: number) => 
  logService.getAllLogs(limit);

