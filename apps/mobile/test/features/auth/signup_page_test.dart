import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:modu_repair/features/auth/presentation/pages/signup_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('signup page keeps in-app simple signup', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final router = GoRouter(
      initialLocation: '/signup?invite=modoab',
      routes: [
        GoRoute(
          path: '/signup',
          builder: (_, __) => const SignupPage(),
        ),
        GoRoute(
          path: '/login',
          builder: (_, __) => const Scaffold(body: Text('login')),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pump();

    expect(find.textContaining('웹에서 가입'), findsNothing);
    expect(find.text('웹에서 가입하기'), findsNothing);
    expect(find.textContaining('간편하게 가입하고'), findsOneWidget);
    expect(find.text('간편가입하기'), findsOneWidget);
    expect(find.text('또는 이메일로 가입'), findsOneWidget);
    expect(find.text('회원가입'), findsWidgets);
    expect(find.text('초대 코드 (선택)'), findsOneWidget);
    expect(find.text('Apple'), findsOneWidget);
    expect(find.text('Google'), findsOneWidget);
    expect(find.text('Naver'), findsOneWidget);
    expect(find.text('Kakao'), findsOneWidget);
  });
}
