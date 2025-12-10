/**
 * 액션 타입 Enum - 사용자 활동 로깅용
 */
export enum ActionType {
  // ========== COMMON ==========
  /** 로그인 */
  LOGIN = 'LOGIN',
  
  /** 로그아웃 */
  LOGOUT = 'LOGOUT',
  
  // ========== WORKER ==========
  /** 입고 스캔 */
  SCAN_INBOUND = 'SCAN_INBOUND',
  
  /** 작업 시작 */
  WORK_START = 'WORK_START',
  
  /** 작업 완료 */
  WORK_COMPLETE = 'WORK_COMPLETE',
  
  /** 추가과금 요청 */
  REQ_EXTRA_CHARGE = 'REQ_EXTRA_CHARGE',
  
  // ========== MANAGER ==========
  /** 추가과금 승인 */
  APPROVE_EXTRA = 'APPROVE_EXTRA',
  
  /** 추가과금 거부 */
  REJECT_EXTRA = 'REJECT_EXTRA',
  
  /** 출고 스캔 */
  SCAN_OUTBOUND = 'SCAN_OUTBOUND',
  
  /** 반품 처리 */
  RETURN_PROCESS = 'RETURN_PROCESS',
  
  // ========== ADMIN ==========
  /** 사용자 정보 수정 */
  UPDATE_USER = 'UPDATE_USER',
  
  /** 사용자 삭제 */
  DELETE_USER = 'DELETE_USER',
}

/**
 * 사용자 역할 타입
 */
export type UserRole = 'ADMIN' | 'MANAGER' | 'WORKER' | 'CUSTOMER';

/**
 * 액션 로그 데이터 인터페이스
 */
export interface ActionLog {
  log_id: string;
  actor_id: string;
  actor_name: string;
  actor_role: UserRole;
  action_type: ActionType;
  target_id?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * 액션 타입 카테고리 매핑
 */
export const ACTION_TYPE_CATEGORY: Record<ActionType, string> = {
  [ActionType.LOGIN]: 'COMMON',
  [ActionType.LOGOUT]: 'COMMON',
  
  [ActionType.SCAN_INBOUND]: 'WORKER',
  [ActionType.WORK_START]: 'WORKER',
  [ActionType.WORK_COMPLETE]: 'WORKER',
  [ActionType.REQ_EXTRA_CHARGE]: 'WORKER',
  
  [ActionType.APPROVE_EXTRA]: 'MANAGER',
  [ActionType.REJECT_EXTRA]: 'MANAGER',
  [ActionType.SCAN_OUTBOUND]: 'MANAGER',
  [ActionType.RETURN_PROCESS]: 'MANAGER',
  
  [ActionType.UPDATE_USER]: 'ADMIN',
  [ActionType.DELETE_USER]: 'ADMIN',
};

/**
 * 액션 타입 한글 이름 매핑
 */
export const ACTION_TYPE_DISPLAY_NAME: Record<ActionType, string> = {
  [ActionType.LOGIN]: '로그인',
  [ActionType.LOGOUT]: '로그아웃',
  
  [ActionType.SCAN_INBOUND]: '입고 스캔',
  [ActionType.WORK_START]: '작업 시작',
  [ActionType.WORK_COMPLETE]: '작업 완료',
  [ActionType.REQ_EXTRA_CHARGE]: '추가과금 요청',
  
  [ActionType.APPROVE_EXTRA]: '추가과금 승인',
  [ActionType.REJECT_EXTRA]: '추가과금 거부',
  [ActionType.SCAN_OUTBOUND]: '출고 스캔',
  [ActionType.RETURN_PROCESS]: '반품 처리',
  
  [ActionType.UPDATE_USER]: '사용자 정보 수정',
  [ActionType.DELETE_USER]: '사용자 삭제',
};

