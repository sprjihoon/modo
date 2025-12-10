import { ActionLog, ActionType } from '../types/action-log';

/**
 * KPI 계산 유틸리티
 */

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * 날짜 범위 계산
 */
export const getDateRange = (period: 'today' | 'week' | 'month'): DateRange => {
  const now = new Date();
  const start = new Date();
  
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      // 이번 주 월요일
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
  }
  
  return { start, end: now };
};

/**
 * 기간 내 로그 필터링
 */
export const filterLogsByDateRange = (
  logs: ActionLog[],
  range: DateRange
): ActionLog[] => {
  return logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= range.start && logDate <= range.end;
  });
};

/**
 * 액션 타입별 로그 필터링
 */
export const filterLogsByActionType = (
  logs: ActionLog[],
  actionType: ActionType
): ActionLog[] => {
  return logs.filter(log => log.action_type === actionType);
};

/**
 * 사용자별 로그 그룹화
 */
export const groupLogsByActor = (
  logs: ActionLog[]
): Map<string, ActionLog[]> => {
  const grouped = new Map<string, ActionLog[]>();
  
  logs.forEach(log => {
    const actorId = log.actor_id;
    if (!grouped.has(actorId)) {
      grouped.set(actorId, []);
    }
    grouped.get(actorId)!.push(log);
  });
  
  return grouped;
};

/**
 * 작업자별 KPI
 */
export interface WorkerKPI {
  actorId: string;
  actorName: string;
  workCompleteCount: number;
  avgWorkDuration?: number; // 초 단위
  extraChargeRequestCount: number;
}

/**
 * 작업자별 KPI 계산
 */
export const calculateWorkerKPIs = (
  logs: ActionLog[],
  range: DateRange
): WorkerKPI[] => {
  // 기간 필터링
  const filteredLogs = filterLogsByDateRange(logs, range);
  
  // WORKER 역할만 필터링
  const workerLogs = filteredLogs.filter(log => log.actor_role === 'WORKER');
  
  // 사용자별 그룹화
  const grouped = groupLogsByActor(workerLogs);
  
  const kpis: WorkerKPI[] = [];
  
  grouped.forEach((userLogs, actorId) => {
    const actorName = userLogs[0]?.actor_name || 'Unknown';
    
    // 작업 완료 건수
    const workCompleteLogs = userLogs.filter(
      log => log.action_type === ActionType.WORK_COMPLETE
    );
    const workCompleteCount = workCompleteLogs.length;
    
    // 추가과금 요청 건수
    const extraChargeRequestCount = userLogs.filter(
      log => log.action_type === ActionType.REQ_EXTRA_CHARGE
    ).length;
    
    // 평균 작업 시간 계산 (WORK_START ~ WORK_COMPLETE)
    let avgWorkDuration: number | undefined;
    
    // target_id별로 WORK_START와 WORK_COMPLETE 매칭
    const workSessions = new Map<string, { start?: Date; end?: Date }>();
    
    userLogs.forEach(log => {
      if (log.target_id && (
        log.action_type === ActionType.WORK_START ||
        log.action_type === ActionType.WORK_COMPLETE
      )) {
        if (!workSessions.has(log.target_id)) {
          workSessions.set(log.target_id, {});
        }
        
        const session = workSessions.get(log.target_id)!;
        
        if (log.action_type === ActionType.WORK_START) {
          session.start = new Date(log.timestamp);
        } else if (log.action_type === ActionType.WORK_COMPLETE) {
          session.end = new Date(log.timestamp);
        }
      }
    });
    
    // 완료된 세션들의 평균 시간 계산
    const durations: number[] = [];
    workSessions.forEach(session => {
      if (session.start && session.end) {
        const duration = (session.end.getTime() - session.start.getTime()) / 1000;
        if (duration > 0 && duration < 86400) { // 1일 이내만 유효
          durations.push(duration);
        }
      }
    });
    
    if (durations.length > 0) {
      avgWorkDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    }
    
    kpis.push({
      actorId,
      actorName,
      workCompleteCount,
      avgWorkDuration,
      extraChargeRequestCount,
    });
  });
  
  // 작업 완료 건수 기준 내림차순 정렬
  return kpis.sort((a, b) => b.workCompleteCount - a.workCompleteCount);
};

/**
 * 관리자별 KPI
 */
export interface ManagerKPI {
  actorId: string;
  actorName: string;
  scanCount: number; // SCAN_INBOUND + SCAN_OUTBOUND
  csCount: number; // APPROVE_EXTRA + RETURN_PROCESS
}

/**
 * 관리자별 KPI 계산
 */
export const calculateManagerKPIs = (
  logs: ActionLog[],
  range: DateRange
): ManagerKPI[] => {
  // 기간 필터링
  const filteredLogs = filterLogsByDateRange(logs, range);
  
  // MANAGER 역할만 필터링
  const managerLogs = filteredLogs.filter(log => log.actor_role === 'MANAGER');
  
  // 사용자별 그룹화
  const grouped = groupLogsByActor(managerLogs);
  
  const kpis: ManagerKPI[] = [];
  
  grouped.forEach((userLogs, actorId) => {
    const actorName = userLogs[0]?.actor_name || 'Unknown';
    
    // 입출고 처리량
    const scanCount = userLogs.filter(log =>
      log.action_type === ActionType.SCAN_INBOUND ||
      log.action_type === ActionType.SCAN_OUTBOUND
    ).length;
    
    // CS/승인 처리량
    const csCount = userLogs.filter(log =>
      log.action_type === ActionType.APPROVE_EXTRA ||
      log.action_type === ActionType.RETURN_PROCESS
    ).length;
    
    kpis.push({
      actorId,
      actorName,
      scanCount,
      csCount,
    });
  });
  
  // 총 처리량 기준 내림차순 정렬
  return kpis.sort((a, b) => 
    (b.scanCount + b.csCount) - (a.scanCount + a.csCount)
  );
};

/**
 * 전체 요약 통계
 */
export interface SummaryStats {
  totalWorkComplete: number;
  totalScanOutbound: number;
  totalPendingWork: number; // WORK_START - WORK_COMPLETE
  totalExtraChargeRequests: number;
}

/**
 * 전체 요약 통계 계산
 */
export const calculateSummaryStats = (
  logs: ActionLog[],
  range: DateRange
): SummaryStats => {
  const filteredLogs = filterLogsByDateRange(logs, range);
  
  const totalWorkComplete = filteredLogs.filter(
    log => log.action_type === ActionType.WORK_COMPLETE
  ).length;
  
  const totalScanOutbound = filteredLogs.filter(
    log => log.action_type === ActionType.SCAN_OUTBOUND
  ).length;
  
  const workStartCount = filteredLogs.filter(
    log => log.action_type === ActionType.WORK_START
  ).length;
  
  const workCompleteCount = filteredLogs.filter(
    log => log.action_type === ActionType.WORK_COMPLETE
  ).length;
  
  const totalPendingWork = Math.max(0, workStartCount - workCompleteCount);
  
  const totalExtraChargeRequests = filteredLogs.filter(
    log => log.action_type === ActionType.REQ_EXTRA_CHARGE
  ).length;
  
  return {
    totalWorkComplete,
    totalScanOutbound,
    totalPendingWork,
    totalExtraChargeRequests,
  };
};

/**
 * 시간 포맷 (초 -> 시:분)
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '-';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  return `${minutes}분`;
};

/**
 * 기간 표시 이름
 */
export const getPeriodDisplayName = (period: 'today' | 'week' | 'month'): string => {
  switch (period) {
    case 'today':
      return '오늘';
    case 'week':
      return '이번 주';
    case 'month':
      return '이번 달';
  }
};

