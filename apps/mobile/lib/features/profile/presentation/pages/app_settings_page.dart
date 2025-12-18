import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// 앱 설정 페이지
class AppSettingsPage extends ConsumerStatefulWidget {
  const AppSettingsPage({super.key});

  @override
  ConsumerState<AppSettingsPage> createState() => _AppSettingsPageState();
}

class _AppSettingsPageState extends ConsumerState<AppSettingsPage> {
  bool _pushNotification = true;
  bool _emailNotification = false;
  bool _smsNotification = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('앱 설정'),
        elevation: 0,
        backgroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            const SizedBox(height: 16),
            
            // 알림 설정
            _buildSection(
              '알림 설정',
              [
                _buildSwitchTile(
                  '푸시 알림',
                  '주문 상태 변경 시 알림을 받습니다',
                  Icons.notifications_outlined,
                  _pushNotification,
                  (value) => setState(() => _pushNotification = value),
                ),
                _buildSwitchTile(
                  '이메일 알림',
                  '이메일로 소식을 받습니다',
                  Icons.email_outlined,
                  _emailNotification,
                  (value) => setState(() => _emailNotification = value),
                ),
                _buildSwitchTile(
                  'SMS 알림',
                  '중요한 정보를 SMS로 받습니다',
                  Icons.sms_outlined,
                  _smsNotification,
                  (value) => setState(() => _smsNotification = value),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // 앱 정보
            _buildSection(
              '앱 정보',
              [
                _buildTile(
                  '버전 정보',
                  '1.0.0',
                  Icons.info_outline,
                  null,
                ),
                _buildTile(
                  '서비스 이용약관',
                  null,
                  Icons.description_outlined,
                  () {
                    context.push('/terms');
                  },
                ),
                _buildTile(
                  '개인정보 처리방침',
                  null,
                  Icons.privacy_tip_outlined,
                  () {
                    context.push('/privacy-policy');
                  },
                ),
                _buildTile(
                  '오픈소스 라이선스',
                  null,
                  Icons.code_outlined,
                  () {
                    // TODO: 라이선스 페이지
                  },
                ),
              ],
            ),
          ],
        ),
      ),
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

  Widget _buildSwitchTile(
    String title,
    String subtitle,
    IconData icon,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    return SwitchListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      secondary: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: const Color(0xFF00C896).withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          icon,
          size: 22,
          color: const Color(0xFF00C896),
        ),
      ),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w500,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(
          fontSize: 12,
          color: Colors.grey.shade600,
        ),
      ),
      value: value,
      onChanged: onChanged,
      activeThumbColor: const Color(0xFF00C896),
    );
  }

  Widget _buildTile(
    String title,
    String? trailing,
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
      trailing: trailing != null
          ? Text(
              trailing,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade600,
              ),
            )
          : Icon(
              Icons.arrow_forward_ios,
              size: 14,
              color: Colors.grey.shade400,
            ),
      onTap: onTap,
    );
  }
}

