import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../home/presentation/pages/content_view_page.dart';

/// 이용약관 페이지 (관리자에서 편집 가능한 앱 컨텐츠 사용)
class TermsPage extends ConsumerWidget {
  const TermsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return const ContentViewPage(
      contentKey: 'terms_of_service',
      title: '이용약관',
    );
  }
}

