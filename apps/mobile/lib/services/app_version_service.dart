import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/app_update/app_version_compare.dart';

const iosAppStoreUrl = 'https://apps.apple.com/kr/app/id6759492888';
const androidPlayStoreUrl =
    'https://play.google.com/store/apps/details?id=com.modurepair.app';

/// 서버 `app_versions`와 설치본을 비교해 업데이트 안내를 결정한다.
class AppVersionService {
  static final AppVersionService _instance = AppVersionService._internal();
  factory AppVersionService() => _instance;
  AppVersionService._internal();

  final _supabase = Supabase.instance.client;

  static String get platformKey {
    if (kIsWeb) return 'ios';
    return Platform.isIOS ? 'ios' : 'android';
  }

  static String fallbackStoreUrl() {
    return platformKey == 'ios' ? iosAppStoreUrl : androidPlayStoreUrl;
  }

  Future<AppUpdateDecision> check() async {
    try {
      final info = await PackageInfo.fromPlatform();
      final row = await _supabase
          .from('app_versions')
          .select(
            'latest_version, min_version, store_url, update_message, is_force_update, is_active',
          )
          .eq('platform', platformKey)
          .maybeSingle();

      if (row == null) return AppUpdateDecision.none;

      return decideAppUpdate(
        installedVersion: info.version,
        installedBuild: info.buildNumber,
        latestVersion: (row['latest_version'] as String?) ?? info.version,
        minVersion: (row['min_version'] as String?) ?? '0.0.0',
        isForceUpdate: row['is_force_update'] as bool? ?? false,
        isActive: row['is_active'] as bool? ?? true,
        updateMessage: (row['update_message'] as String?)?.trim().isNotEmpty ==
                true
            ? row['update_message'] as String
            : '새로운 기능이 추가되었습니다. 업데이트해 주세요!',
        storeUrl: (row['store_url'] as String?)?.trim().isNotEmpty == true
            ? row['store_url'] as String
            : fallbackStoreUrl(),
      );
    } catch (e) {
      debugPrint('⚠️ app_versions 조회 실패(무시): $e');
      return AppUpdateDecision.none;
    }
  }

  String _dismissKey(String latestLabel) =>
      'app_update_dismissed_${platformKey}_$latestLabel';

  Future<bool> isSoftDismissed(String latestLabel) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_dismissKey(latestLabel)) ?? false;
  }

  Future<void> dismissSoft(String latestLabel) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_dismissKey(latestLabel), true);
  }
}
