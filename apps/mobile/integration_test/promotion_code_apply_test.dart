import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:integration_test/integration_test.dart';
import 'package:modu_repair/main.dart' as app;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 수거신청 화면에서 테스트 프로모코드 TEST2026 적용을 확인한다.
void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('TEST2026 applies 5000 won discount on pickup request',
      (tester) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('permission_onboarding_completed', true);

    app.main();
    await tester.pumpAndSettle(const Duration(seconds: 5));

    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {}
    await tester.pumpAndSettle(const Duration(seconds: 2));

    await _go(tester, '/login');
    await tester.pumpAndSettle(const Duration(seconds: 3));

    final fields = find.byType(TextFormField);
    expect(fields, findsWidgets, reason: '로그인 이메일/비밀번호 칸이 보여야 합니다');

    await tester.enterText(fields.at(0), 'apple-review@modo.io.kr');
    await tester.enterText(fields.at(1), 'ModoReview2026!');
    await tester.pumpAndSettle();

    final elevated = find.widgetWithText(ElevatedButton, '로그인');
    final filled = find.widgetWithText(FilledButton, '로그인');
    if (elevated.evaluate().isNotEmpty) {
      await tester.tap(elevated.first);
    } else if (filled.evaluate().isNotEmpty) {
      await tester.tap(filled.first);
    } else {
      await tester.tap(find.text('로그인').last);
    }

    var loggedIn = false;
    for (var i = 0; i < 30; i++) {
      await tester.pump(const Duration(milliseconds: 400));
      if (Supabase.instance.client.auth.currentUser != null) {
        loggedIn = true;
        break;
      }
    }
    expect(loggedIn, isTrue, reason: '심사 계정 로그인이 실패했습니다');
    await tester.pumpAndSettle(const Duration(seconds: 2));
    await _dismissBlockingDialogs(tester);

    await _go(
      tester,
      '/pickup-request',
      extra: {
        'repairItems': [
          {
            'name': '밑단 수선',
            'repairPart': '밑단 수선',
            'price': 30000,
            'quantity': 1,
          },
        ],
        'imageUrls': <String>[],
      },
    );
    await tester.pumpAndSettle(const Duration(seconds: 5));
    await _dismissBlockingDialogs(tester);

    final promoTitle = find.text('프로모션 코드');
    await tester.scrollUntilVisible(
      promoTitle,
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();

    final promoField = find.byWidgetPredicate(
      (widget) =>
          widget is TextField &&
          widget.decoration?.hintText == '프로모션 코드를 입력하세요',
    );
    expect(promoField, findsOneWidget);
    await tester.enterText(promoField, 'TEST2026');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();

    final applyBtn = find.widgetWithText(ElevatedButton, '적용');
    await tester.ensureVisible(applyBtn);
    await tester.pumpAndSettle();
    await _dismissBlockingDialogs(tester);
    await tester.ensureVisible(applyBtn);
    await tester.pumpAndSettle();
    await tester.tap(applyBtn);
    await tester.pumpAndSettle(const Duration(seconds: 6));

    expect(
      find.textContaining('프로모션 코드가 적용되었습니다'),
      findsOneWidget,
      reason: '적용 성공 스낵바가 보여야 합니다',
    );
    expect(find.text('TEST2026'), findsWidgets);
    expect(find.textContaining('5,000원 할인'), findsWidgets);

    await binding.convertFlutterSurfaceToImage();
    await binding.takeScreenshot('promo_test2026_applied');
  });
}

Future<void> _go(
  WidgetTester tester,
  String location, {
  Object? extra,
}) async {
  final host = tester.element(find.byType(Scaffold).first);
  GoRouter.of(host).go(location, extra: extra);
}

Future<void> _dismissBlockingDialogs(WidgetTester tester) async {
  for (var i = 0; i < 4; i++) {
    final later = find.text('나중에');
    if (later.evaluate().isNotEmpty) {
      await tester.tap(later.first);
      await tester.pumpAndSettle();
      continue;
    }

    final closeIcon = find.byIcon(Icons.close);
    if (closeIcon.evaluate().isNotEmpty) {
      await tester.tap(closeIcon.first);
      await tester.pumpAndSettle();
      continue;
    }

    final closeText = find.text('닫기');
    if (closeText.evaluate().isNotEmpty) {
      await tester.tap(closeText.first);
      await tester.pumpAndSettle();
      continue;
    }

    if (find.byType(Dialog).evaluate().isNotEmpty) {
      await tester.tapAt(const Offset(8, 8));
      await tester.pumpAndSettle();
      continue;
    }
    break;
  }
}
