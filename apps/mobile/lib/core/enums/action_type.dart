/// 액션 타입 Enum - 사용자 활동 로깅용
enum ActionType {
  // ========== COMMON ==========
  /// 로그인
  LOGIN,
  
  /// 로그아웃
  LOGOUT,
  
  // ========== WORKER ==========
  /// 입고 스캔
  SCAN_INBOUND,
  
  /// 작업 시작
  WORK_START,
  
  /// 작업 완료
  WORK_COMPLETE,
  
  /// 추가과금 요청
  REQ_EXTRA_CHARGE,
  
  // ========== MANAGER ==========
  /// 추가과금 승인
  APPROVE_EXTRA,
  
  /// 추가과금 거부
  REJECT_EXTRA,
  
  /// 출고 스캔
  SCAN_OUTBOUND,
  
  /// 반품 처리
  RETURN_PROCESS,
  
  // ========== ADMIN ==========
  /// 사용자 정보 수정
  UPDATE_USER,
  
  /// 사용자 삭제
  DELETE_USER;

  /// String에서 ActionType으로 변환
  static ActionType fromString(String type) {
    switch (type.toUpperCase()) {
      // COMMON
      case 'LOGIN':
        return ActionType.LOGIN;
      case 'LOGOUT':
        return ActionType.LOGOUT;
      
      // WORKER
      case 'SCAN_INBOUND':
        return ActionType.SCAN_INBOUND;
      case 'WORK_START':
        return ActionType.WORK_START;
      case 'WORK_COMPLETE':
        return ActionType.WORK_COMPLETE;
      case 'REQ_EXTRA_CHARGE':
        return ActionType.REQ_EXTRA_CHARGE;
      
      // MANAGER
      case 'APPROVE_EXTRA':
        return ActionType.APPROVE_EXTRA;
      case 'REJECT_EXTRA':
        return ActionType.REJECT_EXTRA;
      case 'SCAN_OUTBOUND':
        return ActionType.SCAN_OUTBOUND;
      case 'RETURN_PROCESS':
        return ActionType.RETURN_PROCESS;
      
      // ADMIN
      case 'UPDATE_USER':
        return ActionType.UPDATE_USER;
      case 'DELETE_USER':
        return ActionType.DELETE_USER;
      
      default:
        throw ArgumentError('Unknown ActionType: $type');
    }
  }

  /// ActionType을 String으로 변환 (DB 저장용)
  String toShortString() {
    return toString().split('.').last;
  }

  /// 한글 이름 반환
  String get displayName {
    switch (this) {
      case ActionType.LOGIN:
        return '로그인';
      case ActionType.LOGOUT:
        return '로그아웃';
      case ActionType.SCAN_INBOUND:
        return '입고 스캔';
      case ActionType.WORK_START:
        return '작업 시작';
      case ActionType.WORK_COMPLETE:
        return '작업 완료';
      case ActionType.REQ_EXTRA_CHARGE:
        return '추가과금 요청';
      case ActionType.APPROVE_EXTRA:
        return '추가과금 승인';
      case ActionType.REJECT_EXTRA:
        return '추가과금 거부';
      case ActionType.SCAN_OUTBOUND:
        return '출고 스캔';
      case ActionType.RETURN_PROCESS:
        return '반품 처리';
      case ActionType.UPDATE_USER:
        return '사용자 정보 수정';
      case ActionType.DELETE_USER:
        return '사용자 삭제';
    }
  }

  /// 카테고리 반환
  String get category {
    switch (this) {
      case ActionType.LOGIN:
      case ActionType.LOGOUT:
        return 'COMMON';
      
      case ActionType.SCAN_INBOUND:
      case ActionType.WORK_START:
      case ActionType.WORK_COMPLETE:
      case ActionType.REQ_EXTRA_CHARGE:
        return 'WORKER';
      
      case ActionType.APPROVE_EXTRA:
      case ActionType.REJECT_EXTRA:
      case ActionType.SCAN_OUTBOUND:
      case ActionType.RETURN_PROCESS:
        return 'MANAGER';
      
      case ActionType.UPDATE_USER:
      case ActionType.DELETE_USER:
        return 'ADMIN';
    }
  }
}

