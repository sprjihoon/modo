import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// 시스템 하단 내비게이션 바(3버튼) · 홈 인디케이터 높이.
///
/// 키보드가 올라오면 내비 바를 덮으므로 0을 반환한다.
/// [MediaQuery.padding]이 0으로 오는 Android 에지투에지 기기에서는
/// [MediaQuery.viewPadding]을 사용한다.
double systemNavBottomInset(MediaQueryData mq) {
  if (mq.viewInsets.bottom > 0) return 0;
  return math.max(mq.padding.bottom, mq.viewPadding.bottom);
}

/// 라이트 UI용 상태바 · 시스템 내비 아이콘.
void applyLightSystemUiOverlay() {
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    statusBarBrightness: Brightness.light,
    systemNavigationBarColor: Colors.transparent,
    systemNavigationBarIconBrightness: Brightness.dark,
    systemNavigationBarContrastEnforced: false,
  ));
}

/// 시스템 하단 인셋을 앱 전체에 반영한다.
///
/// Scaffold는 `resizeToAvoidBottomInset`가 켜져 있으면 내비 바
/// [MediaQuery.padding.bottom]을 무시한다. 홈 FAB·하단 CTA가
/// 3버튼 내비에 가려지는 것을 막기 위해 내비게이터 바깥에서 한 번만 패딩한다.
/// 이미 [SafeArea]를 쓰는 화면은 안쪽 MediaQuery 하단을 제거해 이중 여백이 없다.
class SystemNavInset extends StatelessWidget {
  final Widget child;
  final Color? color;

  const SystemNavInset({
    super.key,
    required this.child,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    final bottom = systemNavBottomInset(mq);
    if (bottom <= 0) return child;

    return ColoredBox(
      color: color ?? Theme.of(context).colorScheme.surface,
      child: Padding(
        padding: EdgeInsets.only(bottom: bottom),
        child: MediaQuery(
          data: mq.copyWith(
            padding: mq.padding.copyWith(bottom: 0),
            viewPadding: mq.viewPadding.copyWith(bottom: 0),
          ),
          child: child,
        ),
      ),
    );
  }
}
