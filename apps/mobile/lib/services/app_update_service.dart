import 'dart:io';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

/// 앱 업데이트 체크 서비스
/// 
/// 사용법:
/// ```dart
/// // 앱 시작 시 또는 홈 화면에서 호출
/// AppUpdateService().checkForUpdate(context);
/// ```
class AppUpdateService {
  static final AppUpdateService _instance = AppUpdateService._internal();
  factory AppUpdateService() => _instance;
  AppUpdateService._internal();

  final SupabaseClient _supabase = Supabase.instance.client;
  
  // 하루에 한 번만 선택적 업데이트 다이얼로그 표시
  DateTime? _lastOptionalUpdateCheck;

  /// 버전 비교: newVersion > currentVersion 이면 true
  /// 예: "1.2.0" > "1.1.0" => true
  bool _isVersionGreater(String newVersion, String currentVersion) {
    try {
      final newParts = newVersion.split('.').map(int.parse).toList();
      final currentParts = currentVersion.split('.').map(int.parse).toList();
      
      // 버전 배열 길이 맞추기
      while (newParts.length < 3) newParts.add(0);
      while (currentParts.length < 3) currentParts.add(0);
      
      for (int i = 0; i < newParts.length; i++) {
        if (i >= currentParts.length) return true;
        if (newParts[i] > currentParts[i]) return true;
        if (newParts[i] < currentParts[i]) return false;
      }
      return false;
    } catch (e) {
      debugPrint('버전 비교 오류: $e');
      return false;
    }
  }

  /// 업데이트 체크 메인 함수
  /// 
  /// [context] - BuildContext (다이얼로그 표시용)
  /// [forceCheck] - true면 하루 제한 무시하고 항상 체크
  Future<void> checkForUpdate(BuildContext context, {bool forceCheck = false}) async {
    try {
      // 현재 앱 버전 가져오기
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;
      
      debugPrint('📱 현재 앱 버전: $currentVersion');
      
      // 플랫폼 확인
      final platform = Platform.isAndroid ? 'android' : 'ios';
      
      // Supabase에서 최신 버전 정보 가져오기
      final response = await _supabase
          .from('app_versions')
          .select()
          .eq('platform', platform)
          .eq('is_active', true)
          .maybeSingle();
      
      if (response == null) {
        debugPrint('⚠️ 버전 정보 없음 (app_versions 테이블 확인 필요)');
        return;
      }
      
      final latestVersion = response['latest_version'] as String;
      final minVersion = response['min_version'] as String;
      final storeUrl = response['store_url'] as String;
      final updateMessage = response['update_message'] as String? ?? '새 버전이 출시되었습니다.';
      final isForceUpdate = response['is_force_update'] as bool? ?? false;
      
      debugPrint('🔄 최신 버전: $latestVersion, 최소 버전: $minVersion');
      
      // 강제 업데이트 필요 여부 확인 (현재 버전 < 최소 버전)
      final needsForceUpdate = _isVersionGreater(minVersion, currentVersion);
      
      // 선택적 업데이트 가능 여부 확인 (현재 버전 < 최신 버전)
      final hasUpdate = _isVersionGreater(latestVersion, currentVersion);
      
      if (!context.mounted) return;
      
      if (needsForceUpdate || isForceUpdate) {
        // 강제 업데이트 다이얼로그 (닫기 불가)
        debugPrint('🚨 강제 업데이트 필요!');
        _showForceUpdateDialog(context, updateMessage, storeUrl);
      } else if (hasUpdate) {
        // 선택적 업데이트: 하루에 한 번만 표시
        if (!forceCheck && _lastOptionalUpdateCheck != null) {
          final difference = DateTime.now().difference(_lastOptionalUpdateCheck!);
          if (difference.inHours < 24) {
            debugPrint('ℹ️ 선택적 업데이트 다이얼로그 스킵 (24시간 내 이미 표시됨)');
            return;
          }
        }
        
        _lastOptionalUpdateCheck = DateTime.now();
        debugPrint('📢 새 버전 사용 가능: $latestVersion');
        _showOptionalUpdateDialog(context, updateMessage, storeUrl, latestVersion);
      } else {
        debugPrint('✅ 최신 버전 사용 중');
      }
    } catch (e) {
      debugPrint('❌ 업데이트 체크 실패: $e');
      // 업데이트 체크 실패해도 앱 사용은 가능하도록 에러 무시
    }
  }

  /// 강제 업데이트 다이얼로그 (닫을 수 없음)
  void _showForceUpdateDialog(BuildContext context, String message, String storeUrl) {
    showDialog(
      context: context,
      barrierDismissible: false,  // 배경 터치로 닫기 불가
      builder: (context) => PopScope(
        canPop: false,  // 뒤로가기 버튼으로 닫기 불가
        child: AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Row(
            children: [
              Icon(Icons.system_update, color: Colors.red[700]),
              const SizedBox(width: 8),
              const Text('업데이트 필요'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(message),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber, color: Colors.red[700], size: 20),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        '앱을 계속 사용하려면 업데이트가 필요합니다.',
                        style: TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _openStore(storeUrl),
                icon: const Icon(Icons.download),
                label: const Text('지금 업데이트'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  backgroundColor: Theme.of(context).primaryColor,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 선택적 업데이트 다이얼로그
  void _showOptionalUpdateDialog(
    BuildContext context, 
    String message, 
    String storeUrl,
    String newVersion,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: [
            Icon(Icons.celebration, color: Colors.blue[700]),
            const SizedBox(width: 8),
            const Text('새 버전 출시'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.blue[100],
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                'v$newVersion',
                style: TextStyle(
                  color: Colors.blue[800],
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(message),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('나중에'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.of(context).pop();
              _openStore(storeUrl);
            },
            icon: const Icon(Icons.download, size: 18),
            label: const Text('업데이트'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).primaryColor,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  /// 스토어 열기
  Future<void> _openStore(String storeUrl) async {
    try {
      final uri = Uri.parse(storeUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        debugPrint('❌ 스토어 URL을 열 수 없음: $storeUrl');
      }
    } catch (e) {
      debugPrint('❌ 스토어 열기 실패: $e');
    }
  }
}

