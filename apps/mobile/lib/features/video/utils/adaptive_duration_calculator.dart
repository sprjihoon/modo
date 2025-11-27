import 'dart:math';

/// Adaptive Target Duration 계산 유틸리티
/// 
/// 두 영상의 길이가 다를 때, 재생 속도를 조절하여 동시에 끝나도록 합니다.
class AdaptiveDurationCalculator {
  /// 두 영상의 duration을 기반으로 최적의 target duration 계산
  /// 
  /// Case A: ratio ≤ 1.5 → 평균값 사용
  /// Case B: 1.5 < ratio ≤ 2 → 짧은 영상 기준 1.3배
  /// Case C: ratio > 2 → 극단적 차이, 5~8초 범위로 제한
  static double calculateAdaptiveTargetDuration(
    double inboundDuration,
    double outboundDuration,
  ) {
    if (inboundDuration <= 0 || outboundDuration <= 0) {
      return max(inboundDuration, outboundDuration);
    }

    final minD = min(inboundDuration, outboundDuration);
    final maxD = max(inboundDuration, outboundDuration);
    final ratio = maxD / minD;

    double target;

    if (ratio <= 1.5) {
      // Case A: 비슷한 길이 → 평균
      target = (inboundDuration + outboundDuration) / 2;
    } else if (ratio <= 2.0) {
      // Case B: 중간 차이 → 짧은 영상 기준 1.3배
      target = minD * 1.3;
      final maxLimit = maxD * 0.8;
      if (target > maxLimit) {
        target = maxLimit;
      }
    } else {
      // Case C: 극단적 차이 → 5~8초 범위로 제한
      target = minD * 1.8;
      target = target.clamp(5.0, 8.0);
    }

    return target;
  }

  /// 재생 속도 계산 (0.3 ~ 2.5 범위로 제한)
  /// 
  /// Returns: { inboundSpeed, outboundSpeed }
  static Map<String, double> calculatePlaybackSpeeds({
    required double inboundDuration,
    required double outboundDuration,
    required double targetDuration,
  }) {
    if (targetDuration <= 0) {
      return {'inboundSpeed': 1.0, 'outboundSpeed': 1.0};
    }

    double inboundSpeed = inboundDuration / targetDuration;
    double outboundSpeed = outboundDuration / targetDuration;

    // Speed 범위 제한 (0.3 ~ 2.5)
    const minSpeed = 0.3;
    const maxSpeed = 2.5;

    inboundSpeed = inboundSpeed.clamp(minSpeed, maxSpeed);
    outboundSpeed = outboundSpeed.clamp(minSpeed, maxSpeed);

    return {
      'inboundSpeed': inboundSpeed,
      'outboundSpeed': outboundSpeed,
    };
  }

  /// 전체 계산 (편의 함수)
  static Map<String, double> calculate({
    required double inboundDuration,
    required double outboundDuration,
  }) {
    final target = calculateAdaptiveTargetDuration(
      inboundDuration,
      outboundDuration,
    );

    final speeds = calculatePlaybackSpeeds(
      inboundDuration: inboundDuration,
      outboundDuration: outboundDuration,
      targetDuration: target,
    );

    return {
      'targetDuration': target,
      'inboundSpeed': speeds['inboundSpeed']!,
      'outboundSpeed': speeds['outboundSpeed']!,
    };
  }
}

