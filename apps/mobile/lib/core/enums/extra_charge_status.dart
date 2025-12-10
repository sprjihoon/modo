/// 추가 과금 상태 Enum
enum ExtraChargeStatus {
  /// 초기 상태 (기본값)
  NONE,
  
  /// 작업자가 요청함 (관리자 확인 대기)
  PENDING_MANAGER,
  
  /// 관리자 승인 또는 직접 요청 (고객 결제 대기)
  PENDING_CUSTOMER,
  
  /// 고객이 추가금 결제 완료 (작업 재개)
  COMPLETED,
  
  /// 고객이 거절하고 원안대로 진행
  SKIPPED,
  
  /// 고객이 반송 요청 (작업 중단)
  RETURN_REQUESTED;

  /// String에서 ExtraChargeStatus로 변환
  static ExtraChargeStatus fromString(String status) {
    switch (status.toUpperCase()) {
      case 'NONE':
        return ExtraChargeStatus.NONE;
      case 'PENDING_MANAGER':
        return ExtraChargeStatus.PENDING_MANAGER;
      case 'PENDING_CUSTOMER':
        return ExtraChargeStatus.PENDING_CUSTOMER;
      case 'COMPLETED':
        return ExtraChargeStatus.COMPLETED;
      case 'SKIPPED':
        return ExtraChargeStatus.SKIPPED;
      case 'RETURN_REQUESTED':
        return ExtraChargeStatus.RETURN_REQUESTED;
      default:
        return ExtraChargeStatus.NONE; // 기본값
    }
  }

  /// ExtraChargeStatus를 String으로 변환
  String toShortString() {
    return toString().split('.').last;
  }

  /// 한글 상태명 반환
  String get displayName {
    switch (this) {
      case ExtraChargeStatus.NONE:
        return '추가 과금 없음';
      case ExtraChargeStatus.PENDING_MANAGER:
        return '관리자 승인 대기';
      case ExtraChargeStatus.PENDING_CUSTOMER:
        return '고객 결제 대기';
      case ExtraChargeStatus.COMPLETED:
        return '추가 결제 완료';
      case ExtraChargeStatus.SKIPPED:
        return '원안대로 진행';
      case ExtraChargeStatus.RETURN_REQUESTED:
        return '반송 요청';
    }
  }

  /// 고객이 액션을 취해야 하는지 여부
  bool get requiresCustomerAction => this == ExtraChargeStatus.PENDING_CUSTOMER;

  /// 관리자가 액션을 취해야 하는지 여부
  bool get requiresManagerAction => this == ExtraChargeStatus.PENDING_MANAGER;

  /// 워크플로우가 완료되었는지 여부
  bool get isCompleted => this == ExtraChargeStatus.COMPLETED || 
                          this == ExtraChargeStatus.SKIPPED || 
                          this == ExtraChargeStatus.RETURN_REQUESTED;
}

/// 고객의 결정 액션 (결제 대기 시)
enum CustomerDecisionAction {
  /// 추가 결제하고 작업 진행
  PAY,
  
  /// 추가 작업 거절하고 원안대로 진행
  SKIP,
  
  /// 반송 요청 (왕복 배송비 6,000원 차감)
  RETURN;

  String toShortString() {
    return toString().split('.').last;
  }

  String get displayName {
    switch (this) {
      case CustomerDecisionAction.PAY:
        return '결제하기';
      case CustomerDecisionAction.SKIP:
        return '그냥 진행';
      case CustomerDecisionAction.RETURN:
        return '반송하기';
    }
  }
}

