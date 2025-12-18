import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../home/presentation/pages/content_view_page.dart';

/// 개인정보처리방침 페이지 (관리자에서 편집 가능한 앱 컨텐츠 사용)
class PrivacyPolicyPage extends ConsumerWidget {
  const PrivacyPolicyPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return const ContentViewPage(
      contentKey: 'privacy_policy',
      title: '개인정보처리방침',
    );
  }
}

