/// 사용자 역할 Enum
enum UserRole {
  /// 관리자 (전체 권한)
  ADMIN,
  
  /// 입출고 관리자 (입출고 작업 권한)
  MANAGER,
  
  /// 작업자 (수선 작업 권한)
  WORKER;

  /// String에서 UserRole로 변환
  static UserRole fromString(String role) {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return UserRole.ADMIN;
      case 'MANAGER':
        return UserRole.MANAGER;
      case 'WORKER':
        return UserRole.WORKER;
      default:
        return UserRole.WORKER; // 기본값
    }
  }

  /// UserRole을 String으로 변환
  String toShortString() {
    return toString().split('.').last;
  }

  /// 한글 이름 반환
  String get displayName {
    switch (this) {
      case UserRole.ADMIN:
        return '관리자';
      case UserRole.MANAGER:
        return '입출고 관리자';
      case UserRole.WORKER:
        return '작업자';
    }
  }

  /// 관리자 권한 확인
  bool get isAdmin => this == UserRole.ADMIN;

  /// 관리자 또는 매니저 권한 확인
  bool get isManagerOrAbove => this == UserRole.ADMIN || this == UserRole.MANAGER;

  /// 작업자 권한 확인
  bool get isWorker => this == UserRole.WORKER;
}

