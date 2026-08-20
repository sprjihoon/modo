import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../../../../core/app_update/app_version_compare.dart';
import '../../../../core/notifications/notification_settings.dart';
import '../../../../core/widgets/modo_app_bar.dart';
import '../../../app_update/app_update_dialog.dart';

/// 앱 설정 페이지
class AppSettingsPage extends ConsumerWidget {
  const AppSettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: const ModoAppBar(
        title: Text('앱 설정'),
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            children: [
              const SizedBox(height: 16),

              // 앱 버전 (테스터가 설치본 확인용)
              FutureBuilder<PackageInfo>(
                future: PackageInfo.fromPlatform(),
                builder: (context, snap) {
                  final info = snap.data;
                  final versionLabel = info == null
                      ? '확인 중…'
                      : '${info.version} (${info.buildNumber})';
                  return Container(
                    width: double.infinity,
                    margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: const Color(0xFF00C896).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.info_outline,
                            color: Color(0xFF00C896),
                            size: 22,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '앱 버전',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                versionLabel,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),

              _buildSection(
                '알림',
                [
                  _buildTile(
                    context,
                    '알림 설정',
                    Icons.notifications_outlined,
                    () => openNotificationSettings(),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // 앱 정보
              _buildSection(
                '앱 정보',
                [
                  _buildTile(
                    context,
                    '업데이트 확인',
                    Icons.system_update_alt_outlined,
                    () => _checkForUpdate(context),
                  ),
                  _buildTile(
                    context,
                    '서비스 이용약관',
                    Icons.description_outlined,
                    () => context.push('/terms'),
                  ),
                  _buildTile(
                    context,
                    '개인정보 처리방침',
                    Icons.privacy_tip_outlined,
                    () => context.push('/privacy-policy'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _checkForUpdate(BuildContext context) async {
    final kind = await AppUpdatePrompt.maybeShow(
      context,
      ignoreDismissed: true,
    );
    if (!context.mounted || kind != AppUpdateKind.none) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('최신 버전입니다')),
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(32, 0, 16, 8),
          child: Text(
            title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade700,
            ),
          ),
        ),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            children: List.generate(children.length * 2 - 1, (index) {
              if (index.isEven) {
                return children[index ~/ 2];
              } else {
                return Divider(
                  height: 1,
                  indent: 60,
                  color: Colors.grey.shade200,
                );
              }
            }),
          ),
        ),
      ],
    );
  }

  Widget _buildTile(
    BuildContext context,
    String title,
    IconData icon,
    VoidCallback? onTap,
  ) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          icon,
          size: 22,
          color: Colors.grey.shade700,
        ),
      ),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w500,
        ),
      ),
      trailing: Icon(
        Icons.arrow_forward_ios,
        size: 14,
        color: Colors.grey.shade400,
      ),
      onTap: onTap,
    );
  }
}
