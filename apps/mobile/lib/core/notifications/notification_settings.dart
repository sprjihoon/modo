import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';

const _androidSettingsChannel = MethodChannel('com.modurepair.app/settings');

/// 플랫폼별 알림 설정 화면을 연다.
/// Android: 앱 알림 설정. iOS: 해당 앱 설정(알림 토글이 있는 화면).
Future<bool> openNotificationSettings() async {
  try {
    if (!kIsWeb && Platform.isAndroid) {
      final ok = await _androidSettingsChannel.invokeMethod<bool>(
        'openNotificationSettings',
      );
      return ok ?? false;
    }
    return openAppSettings();
  } catch (e) {
    debugPrint('⚠️ 알림 설정 열기 실패, 앱 설정으로 대체: $e');
    return openAppSettings();
  }
}

Future<bool> isNotificationGranted() async {
  final status = await Permission.notification.status;
  return status.isGranted;
}
