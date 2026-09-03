import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/core/widgets/system_nav_inset.dart';

void main() {
  group('systemNavBottomInset', () {
    test('3버튼 내비에서 padding이 0이면 viewPadding을 쓴다', () {
      expect(
        systemNavBottomInset(const MediaQueryData(
          viewPadding: EdgeInsets.only(bottom: 48),
          padding: EdgeInsets.zero,
        )),
        48,
      );
    });

    test('제스처 내비의 홈 인디케이터 높이를 그대로 쓴다', () {
      expect(
        systemNavBottomInset(const MediaQueryData(
          padding: EdgeInsets.only(bottom: 16),
          viewPadding: EdgeInsets.only(bottom: 16),
        )),
        16,
      );
    });

    test('키보드가 올라오면 내비 여백을 넣지 않는다', () {
      expect(
        systemNavBottomInset(const MediaQueryData(
          viewInsets: EdgeInsets.only(bottom: 300),
          viewPadding: EdgeInsets.only(bottom: 48),
          padding: EdgeInsets.zero,
        )),
        0,
      );
    });

    test('인셋이 없으면 0이다', () {
      expect(systemNavBottomInset(const MediaQueryData()), 0);
    });

    test('padding과 viewPadding 중 큰 값을 쓴다', () {
      expect(
        systemNavBottomInset(const MediaQueryData(
          padding: EdgeInsets.only(bottom: 48),
          viewPadding: EdgeInsets.only(bottom: 24),
        )),
        48,
      );
    });
  });

  group('SystemNavInset', () {
    void setView({
      required WidgetTester tester,
      required FakeViewPadding viewPadding,
      FakeViewPadding padding = FakeViewPadding.zero,
      FakeViewPadding viewInsets = FakeViewPadding.zero,
    }) {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1;
      tester.view.padding = padding;
      tester.view.viewPadding = viewPadding;
      tester.view.viewInsets = viewInsets;
      addTearDown(tester.view.reset);
    }

    testWidgets('3버튼 내비 높이만큼 화면을 올린다', (tester) async {
      setView(
        tester: tester,
        viewPadding: const FakeViewPadding(bottom: 48),
      );

      await tester.pumpWidget(
        const MaterialApp(
          home: SystemNavInset(
            child: Scaffold(
              body: Align(
                alignment: Alignment.bottomCenter,
                child: SizedBox(height: 20, child: Text('cta')),
              ),
            ),
          ),
        ),
      );

      expect(tester.getRect(find.text('cta')).bottom, 800 - 48);
    });

    testWidgets('이미 SafeArea가 있어도 하단을 두 번 띄우지 않는다', (tester) async {
      setView(
        tester: tester,
        padding: const FakeViewPadding(bottom: 48),
        viewPadding: const FakeViewPadding(bottom: 48),
      );

      await tester.pumpWidget(
        const MaterialApp(
          home: SystemNavInset(
            child: SafeArea(
              child: Scaffold(
                body: Align(
                  alignment: Alignment.bottomCenter,
                  child: SizedBox(height: 20, child: Text('cta')),
                ),
              ),
            ),
          ),
        ),
      );

      expect(tester.getRect(find.text('cta')).bottom, 800 - 48);
    });

    testWidgets('키보드가 있어도 MediaQuery 하단 패딩을 0으로 유지한다', (tester) async {
      setView(
        tester: tester,
        padding: const FakeViewPadding(bottom: 48),
        viewPadding: const FakeViewPadding(bottom: 48),
        viewInsets: const FakeViewPadding(bottom: 300),
      );

      late MediaQueryData inner;
      await tester.pumpWidget(
        MaterialApp(
          home: SystemNavInset(
            child: Builder(
              builder: (context) {
                inner = MediaQuery.of(context);
                return const SizedBox.shrink();
              },
            ),
          ),
        ),
      );

      expect(inner.padding.bottom, 0);
      expect(inner.viewPadding.bottom, 0);
      expect(inner.viewInsets.bottom, 300);
    });

    testWidgets('키보드가 있으면 추가 하단 패딩을 넣지 않는다', (tester) async {
      setView(
        tester: tester,
        viewPadding: const FakeViewPadding(bottom: 48),
        viewInsets: const FakeViewPadding(bottom: 300),
      );

      await tester.pumpWidget(
        const MaterialApp(
          home: SystemNavInset(
            child: Scaffold(
              resizeToAvoidBottomInset: false,
              body: Align(
                alignment: Alignment.bottomCenter,
                child: SizedBox(height: 20, child: Text('cta')),
              ),
            ),
          ),
        ),
      );

      expect(tester.getRect(find.text('cta')).bottom, 800);
    });
  });
}
