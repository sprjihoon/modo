import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/widgets/company_footer.dart';
import '../../../../core/widgets/modo_app_bar.dart';
import '../../../profile/domain/invite_share.dart';

/// 가입은 웹에서 하고, 앱에서는 설치 후 로그인한다.
class SignupPage extends StatelessWidget {
  const SignupPage({super.key});

  String _inviteFromRoute(BuildContext context) {
    return normalizeInviteCode(
      GoRouterState.of(context).uri.queryParameters['invite'],
    );
  }

  Future<void> _openWebSignup(BuildContext context) async {
    final url = Uri.parse(webSignupHref(_inviteFromRoute(context)));
    final ok = await launchUrl(url, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('웹 가입 페이지를 열 수 없습니다')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final invite = _inviteFromRoute(context);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const ModoAppBar(
        title: Text(
          '회원가입',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        showHome: false,
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      '웹에서 가입한 뒤\n앱에서 로그인하세요',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '초대 코드와 포인트는 웹 가입 때 적용됩니다. 가입이 끝나면 앱을 설치하고 같은 계정으로 로그인하세요.',
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.5,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    if (invite.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00C896).withOpacity(0.08),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '초대 코드 $invite가 웹 가입에 적용됩니다',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF00C896),
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 32),
                    ElevatedButton(
                      onPressed: () => _openWebSignup(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00C896),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: const Text(
                        '웹에서 가입하기',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: () {
                        context.go(loginPathWithInvite(invite));
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF00C896),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        side: const BorderSide(color: Color(0xFF00C896)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        '이미 가입했다면 로그인',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const CompanyFooter(),
          ],
        ),
      ),
    );
  }
}
