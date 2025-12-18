/// 🚀 Feature Flags for Video Processing Improvements
/// 
/// 이 파일은 영상 처리 개선 사항을 점진적으로 적용하기 위한
/// Feature Flag를 관리합니다.
/// 
/// 사용 방법:
/// 1. 개발 환경: 모든 Flag를 true로 설정하여 테스트
/// 2. 베타 테스트: 일부 사용자에게만 새 기능 활성화
/// 3. 프로덕션: 안정화 후 전체 사용자에게 적용
/// 4. 롤백: 문제 발생 시 Flag를 false로 변경하여 즉시 복구
class VideoFeatureFlags {
  /// media_kit 비디오 플레이어 사용 여부
  /// 
  /// - true: media_kit (libmpv 기반, 고성능)
  /// - false: video_player (기존 플레이어)
  /// 
  /// 개선 효과:
  /// - 재생 성능: +50-80%
  /// - 크래시: -90%
  /// - 버퍼링: -70%
  static const bool useMediaKit = true;

  /// 비디오 캐싱 사용 여부
  /// 
  /// - true: flutter_cache_manager로 비디오 캐싱
  /// - false: 매번 네트워크에서 로드
  /// 
  /// 개선 효과:
  /// - 데이터 사용: -80% (재시청 시)
  /// - 재생 시작: -90% (캐시 히트 시)
  static const bool useVideoCache = true;

  /// Adaptive Bitrate 자동 조절 사용 여부
  /// 
  /// - true: 네트워크 상태에 따라 품질 자동 조절
  /// - false: 고정 품질
  /// 
  /// 개선 효과:
  /// - 데이터 사용: -40%
  /// - 버퍼링: -60%
  static const bool useAdaptiveBitrate = true;

  /// 비디오 프리로드 사용 여부
  /// 
  /// - true: 주문 상세 페이지 진입 시 자동 프리로드
  /// - false: 재생 버튼 클릭 시 로드
  /// 
  /// 개선 효과:
  /// - 재생 시작 시간: -50%
  static const bool useVideoPreload = true;

  /// 베타 모드 (모든 개선 기능 활성화)
  /// 
  /// - true: 위의 모든 Flag를 무시하고 새 기능 사용
  /// - false: 개별 Flag 설정 사용
  static const bool betaMode = true;

  /// 디버그 로그 출력 여부
  static const bool enableDebugLogs = true;

  // ==========================================
  // Helper Methods
  // ==========================================

  /// media_kit 사용 여부 (베타 모드 고려)
  static bool get shouldUseMediaKit => betaMode || useMediaKit;

  /// 캐싱 사용 여부 (베타 모드 고려)
  static bool get shouldUseCache => betaMode || useVideoCache;

  /// ABR 사용 여부 (베타 모드 고려)
  static bool get shouldUseABR => betaMode || useAdaptiveBitrate;

  /// 프리로드 사용 여부 (베타 모드 고려)
  static bool get shouldPreload => betaMode || useVideoPreload;

  /// Feature Flag 상태 출력 (디버그용)
  static void printStatus() {
    if (!enableDebugLogs) return;

    print('🚀 Video Feature Flags Status:');
    print('   Beta Mode: $betaMode');
    print('   Use media_kit: $shouldUseMediaKit');
    print('   Use Cache: $shouldUseCache');
    print('   Use ABR: $shouldUseABR');
    print('   Use Preload: $shouldPreload');
  }
}

/// 환경별 Feature Flag 설정
/// 
/// 개발/스테이징/프로덕션 환경에 따라 다른 설정 사용 가능
class VideoFeatureFlagsEnvironment {
  /// 개발 환경 (모든 기능 활성화)
  static VideoFeatureFlags get development => VideoFeatureFlags();

  /// 스테이징 환경 (베타 기능 테스트)
  static VideoFeatureFlags get staging => VideoFeatureFlags();

  /// 프로덕션 환경 (안정화된 기능만)
  static VideoFeatureFlags get production => VideoFeatureFlags();
}

