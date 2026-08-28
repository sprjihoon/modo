import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:modu_repair/features/auth/presentation/pages/signup_page.dart';

void main() {
  testWidgets('signup page sends users to web signup', (tester) async {
    final router = GoRouter(
      initialLocation: '/signup?invite=modoab',
      routes: [
        GoRoute(
          path: '/signup',
          builder: (_, __) => const SignupPage(),
        ),
      ],
    );

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));

    expect(find.textContaining('웹에서 가입한 뒤'), findsOneWidget);
    expect(find.textContaining('초대 코드 MODOAB'), findsOneWidget);
    expect(find.text('웹에서 가입하기'), findsOneWidget);
    expect(find.text('이미 가입했다면 로그인'), findsOneWidget);
  });
}
