import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// 예전 첫 실행 권한 온보딩. 5.1.1(iv)로 권한은 기능 사용 시점에만 요청하므로
/// 이 화면은 바로 홈으로 보낸다.
class PermissionOnboardingPage extends StatefulWidget {
  const PermissionOnboardingPage({super.key});

  @override
  State<PermissionOnboardingPage> createState() =>
      _PermissionOnboardingPageState();
}

class _PermissionOnboardingPageState extends State<PermissionOnboardingPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.go('/home');
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
