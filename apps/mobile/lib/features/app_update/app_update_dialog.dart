import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_update/app_version_compare.dart';
import '../../services/app_version_service.dart';

/// 강제/권장 업데이트 다이얼로그. 홈·스플래시·설정에서 재사용한다.
class AppUpdatePrompt {
  AppUpdatePrompt._();

  static const _brand = Color(0xFF00C896);
  static bool _showing = false;

  /// [allowSoft] false면 강제 업데이트만. [ignoreDismissed]는 설정에서 수동 확인용.
  static Future<AppUpdateKind> maybeShow(
    BuildContext context, {
    bool allowSoft = true,
    bool ignoreDismissed = false,
  }) async {
    if (_showing || !context.mounted) return AppUpdateKind.none;

    final decision = await AppVersionService().check();
    if (!context.mounted || !decision.shouldPrompt) {
      return AppUpdateKind.none;
    }
    if (decision.kind == AppUpdateKind.soft && !allowSoft) {
      return AppUpdateKind.none;
    }
    if (decision.kind == AppUpdateKind.soft &&
        !ignoreDismissed &&
        await AppVersionService().isSoftDismissed(decision.latestLabel)) {
      return AppUpdateKind.none;
    }
    if (!context.mounted) return AppUpdateKind.none;

    _showing = true;
    try {
      await showDialog<void>(
        context: context,
        barrierDismissible: !decision.isForce,
        builder: (dialogContext) => _AppUpdateDialog(
          decision: decision,
          brand: _brand,
          onLater: decision.isForce
              ? null
              : () async {
                  await AppVersionService().dismissSoft(decision.latestLabel);
                  if (dialogContext.mounted) {
                    Navigator.of(dialogContext).pop();
                  }
                },
        ),
      );
    } finally {
      _showing = false;
    }
    return decision.kind;
  }
}

class _AppUpdateDialog extends StatelessWidget {
  const _AppUpdateDialog({
    required this.decision,
    required this.brand,
    this.onLater,
  });

  final AppUpdateDecision decision;
  final Color brand;
  final Future<void> Function()? onLater;

  Future<void> _openStore() async {
    final url = Uri.tryParse(decision.storeUrl);
    if (url == null) return;
    await launchUrl(url, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !decision.isForce,
      child: Dialog(
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
                child: Icon(
                  Icons.system_update_alt_rounded,
                  size: 40,
                  color: brand,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                decision.isForce ? '업데이트가 필요합니다' : '새 버전이 있어요',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 8),
              if (decision.latestLabel.isNotEmpty)
                Text(
                  '최신 버전 ${decision.latestLabel}',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: brand,
                  ),
                ),
              const SizedBox(height: 12),
              Text(
                decision.message,
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
                  onPressed: _openStore,
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
                    '업데이트',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              if (onLater != null) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: onLater,
                    child: Text(
                      '나중에',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
