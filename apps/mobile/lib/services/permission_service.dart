import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

/// 앱 권한 관리 서비스
class PermissionService {
  /// 카메라 권한 요청
  static Future<bool> requestCameraPermission(BuildContext context) async {
    final status = await Permission.camera.status;
    
    if (status.isGranted) {
      return true;
    }
    
    if (status.isDenied) {
      // 권한 요청 전 안내 다이얼로그 표시
      final shouldRequest = await _showPermissionDialog(
        context,
        title: '카메라 권한 필요',
        message: '수선 요청 사진을 촬영하려면 카메라 접근 권한이 필요합니다.',
        icon: Icons.camera_alt_outlined,
      );
      
      if (shouldRequest) {
        final result = await Permission.camera.request();
        return result.isGranted;
      }
      return false;
    }
    
    if (status.isPermanentlyDenied) {
      // 설정 페이지로 이동 안내
      await _showSettingsDialog(
        context,
        title: '카메라 권한 필요',
        message: '카메라 권한이 거부되어 있습니다.\n설정에서 권한을 허용해주세요.',
      );
      return false;
    }
    
    return false;
  }
  
  /// 갤러리(사진) 권한 요청
  static Future<bool> requestPhotosPermission(BuildContext context) async {
    final status = await Permission.photos.status;
    
    if (status.isGranted) {
      return true;
    }
    
    if (status.isDenied) {
      final shouldRequest = await _showPermissionDialog(
        context,
        title: '사진 접근 권한 필요',
        message: '수선할 의류 사진을 선택하려면 갤러리 접근 권한이 필요합니다.',
        icon: Icons.photo_library_outlined,
      );
      
      if (shouldRequest) {
        final result = await Permission.photos.request();
        return result.isGranted;
      }
      return false;
    }
    
    if (status.isPermanentlyDenied) {
      await _showSettingsDialog(
        context,
        title: '사진 접근 권한 필요',
        message: '사진 접근 권한이 거부되어 있습니다.\n설정에서 권한을 허용해주세요.',
      );
      return false;
    }
    
    return false;
  }
  
  /// 알림 권한 요청
  static Future<bool> requestNotificationPermission(BuildContext context) async {
    final status = await Permission.notification.status;
    
    if (status.isGranted) {
      return true;
    }
    
    if (status.isDenied) {
      final shouldRequest = await _showPermissionDialog(
        context,
        title: '알림 권한 필요',
        message: '주문 상태 변경, 수선 완료 알림 등\n중요한 정보를 받으시려면 알림을 허용해주세요.',
        icon: Icons.notifications_outlined,
      );
      
      if (shouldRequest) {
        final result = await Permission.notification.request();
        return result.isGranted;
      }
      return false;
    }
    
    if (status.isPermanentlyDenied) {
      await _showSettingsDialog(
        context,
        title: '알림 권한 필요',
        message: '알림 권한이 거부되어 있습니다.\n설정에서 알림을 허용해주세요.',
      );
      return false;
    }
    
    return false;
  }
  
  /// 카메라 + 갤러리 권한 동시 요청 (이미지 선택 시)
  static Future<bool> requestImagePermissions(BuildContext context) async {
    final cameraStatus = await Permission.camera.status;
    final photosStatus = await Permission.photos.status;
    
    // 둘 다 허용되어 있으면 바로 true
    if (cameraStatus.isGranted && photosStatus.isGranted) {
      return true;
    }
    
    // 권한 요청 안내 다이얼로그
    final shouldRequest = await _showPermissionDialog(
      context,
      title: '사진 및 카메라 권한 필요',
      message: '수선 요청을 위해 사진 촬영 및 갤러리 접근 권한이 필요합니다.',
      icon: Icons.add_a_photo_outlined,
    );
    
    if (!shouldRequest) return false;
    
    // 권한 요청
    final results = await [
      Permission.camera,
      Permission.photos,
    ].request();
    
    final cameraGranted = results[Permission.camera]?.isGranted ?? false;
    final photosGranted = results[Permission.photos]?.isGranted ?? false;
    
    // 하나라도 영구 거부면 설정으로 안내
    if (results[Permission.camera]?.isPermanentlyDenied == true ||
        results[Permission.photos]?.isPermanentlyDenied == true) {
      await _showSettingsDialog(
        context,
        title: '권한 설정 필요',
        message: '일부 권한이 거부되어 있습니다.\n설정에서 권한을 허용해주세요.',
      );
    }
    
    return cameraGranted || photosGranted;
  }
  
  /// 앱 시작 시 필수 권한 요청
  static Future<void> requestInitialPermissions(BuildContext context) async {
    // 알림 권한만 앱 시작 시 요청 (Android 13+)
    final notificationStatus = await Permission.notification.status;
    
    if (notificationStatus.isDenied) {
      // 1초 딜레이 후 권한 요청 (UX 개선)
      await Future.delayed(const Duration(seconds: 1));
      
      if (context.mounted) {
        await requestNotificationPermission(context);
      }
    }
  }
  
  /// 권한 요청 전 안내 다이얼로그
  static Future<bool> _showPermissionDialog(
    BuildContext context, {
    required String title,
    required String message,
    required IconData icon,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: Theme.of(context).primaryColor,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        content: Text(
          message,
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[700],
            height: 1.5,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              '나중에',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('허용하기'),
          ),
        ],
      ),
    );
    
    return result ?? false;
  }
  
  /// 설정 페이지로 이동 안내 다이얼로그
  static Future<void> _showSettingsDialog(
    BuildContext context, {
    required String title,
    required String message,
  }) async {
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.settings_outlined,
                color: Colors.orange,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        content: Text(
          message,
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[700],
            height: 1.5,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              '취소',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              openAppSettings(); // 앱 설정 페이지로 이동
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('설정으로 이동'),
          ),
        ],
      ),
    );
  }
}

