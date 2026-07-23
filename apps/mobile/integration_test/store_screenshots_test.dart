import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:modu_repair/main.dart' as app;

/// App Store용 스크린샷 캡처
void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('capture store screenshots', (tester) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('permission_onboarding_completed', true);

    app.main();
    await tester.pumpAndSettle(const Duration(seconds: 5));

    // 시뮬레이터에 남아 있는 만료 세션 제거
    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {}
    await tester.pumpAndSettle(const Duration(seconds: 2));

    // 로그인 화면으로
    final loginFinder = find.text('로그인');
    if (loginFinder.evaluate().isEmpty) {
      // 스플래시/홈에 있을 수 있음 — 잠시 더 대기
      await tester.pumpAndSettle(const Duration(seconds: 3));
    }

    final fields = find.byType(TextFormField);
    expect(fields, findsWidgets);

    await tester.enterText(fields.at(0), 'apple-review@modo.io.kr');
    await tester.enterText(fields.at(1), 'ModoReview2026!');
    await tester.pumpAndSettle();

    // 로그인 버튼 (텍스트/ElevatedButton)
    final elevated = find.widgetWithText(ElevatedButton, '로그인');
    final filled = find.widgetWithText(FilledButton, '로그인');
    final textBtn = find.text('로그인');
    if (elevated.evaluate().isNotEmpty) {
      await tester.tap(elevated.first);
    } else if (filled.evaluate().isNotEmpty) {
      await tester.tap(filled.first);
    } else {
      await tester.tap(textBtn.last);
    }
    await tester.pumpAndSettle(const Duration(seconds: 6));

    await binding.convertFlutterSurfaceToImage();
    await binding.takeScreenshot('01_home');

    // 수선 접수
    for (final label in ['수선 접수하기', '첫 수선신청 하기', '수선 신청', '시작하기']) {
      final f = find.text(label);
      if (f.evaluate().isNotEmpty) {
        await tester.tap(f.first);
        await tester.pumpAndSettle(const Duration(seconds: 4));
        await binding.takeScreenshot('02_repair');
        break;
      }
    }

    // 뒤로 후 마이페이지
    final back = find.byTooltip('Back');
    if (back.evaluate().isNotEmpty) {
      await tester.tap(back.first);
      await tester.pumpAndSettle(const Duration(seconds: 2));
    } else {
      final backIcon = find.byIcon(Icons.arrow_back);
      if (backIcon.evaluate().isNotEmpty) {
        await tester.tap(backIcon.first);
        await tester.pumpAndSettle(const Duration(seconds: 2));
      }
    }

    for (final label in ['마이페이지', '마이', '내 정보']) {
      final f = find.text(label);
      if (f.evaluate().isNotEmpty) {
        await tester.tap(f.first);
        await tester.pumpAndSettle(const Duration(seconds: 3));
        await binding.takeScreenshot('03_mypage');
        break;
      }
    }

    // 홈 배너/가격표 등 추가 화면
    final price = find.text('가격표');
    if (price.evaluate().isNotEmpty) {
      await tester.tap(price.first);
      await tester.pumpAndSettle(const Duration(seconds: 3));
      await binding.takeScreenshot('04_price');
    }
  });
}
