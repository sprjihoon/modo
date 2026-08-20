import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/notifications/notification_settings.dart';
import '../../../../services/notification_service.dart';

/// 로그인 후 알림이 꺼져 있으면 설정 화면으로 안내한다.
class NotificationPermissionPrompt {
  NotificationPermissionPrompt._();

  static const _brand = Color(0xFF00C896);
  static const _dismissKey = 'notif_permission_prompt_dismissed';
  static bool _showing = false;

  static Future<void> maybeShow(BuildContext context) async {
    if (_showing || !context.mounted) return;
    if (await isNotificationGranted()) {
      await NotificationService().initialize(requestIfNeeded: false);
      await NotificationService().onLogin();
      return;
    }

    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_dismissKey) == true) return;
    if (!context.mounted) return;

    _showing = true;
    try {
      await showDialog<void>(
        context: context,
        barrierDismissible: true,
        builder: (dialogContext) => _PromptDialog(
          brand: _brand,
          onEnable: () async {
            final status = await Permission.notification.status;
            if (status.isDenied) {
              final result = await Permission.notification.request();
              if (result.isGranted) {
                await NotificationService().initialize(requestIfNeeded: false);
                await NotificationService().onLogin();
                if (dialogContext.mounted) Navigator.of(dialogContext).pop();
                return;
              }
            }
            await openNotificationSettings();
            if (dialogContext.mounted) Navigator.of(dialogContext).pop();
          },
          onLater: () async {
            await prefs.setBool(_dismissKey, true);
            if (dialogContext.mounted) Navigator.of(dialogContext).pop();
          },
        ),
      );
    } finally {
      _showing = false;
    }
  }
}

class _PromptDialog extends StatelessWidget {
  const _PromptDialog({
    required this.brand,
    required this.onEnable,
    required this.onLater,
  });

  final Color brand;
  final Future<void> Function() onEnable;
  final Future<void> Function() onLater;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: brand.withOpacity(0.12),
                borderRadius: BorderRadius.circular(36),
              ),
              child: Icon(Icons.notifications_active_outlined,
                  size: 40, color: brand),
            ),
            const SizedBox(height: 20),
            const Text(
              '알림을 켜 주세요',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              '주문·수거·수선 진행 소식을 받으려면 알림이 필요합니다.\n설정에서 모두의수선 알림을 허용해 주세요.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                color: Colors.grey.shade700,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onEnable,
                style: ElevatedButton.styleFrom(
                  backgroundColor: brand,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  '설정에서 허용',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: onLater,
                child: Text(
                  '나중에',
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
