import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:modu_repair/core/widgets/modo_app_bar.dart';

class _TestHarness extends StatelessWidget {
  final String initialLocation;
  final ModoAppBar appBar;

  const _TestHarness({
    required this.appBar,
    this.initialLocation = '/sub',
  });

  @override
  Widget build(BuildContext context) {
    final router = GoRouter(
      initialLocation: initialLocation,
      routes: [
        GoRoute(
          path: '/home',
          builder: (_, __) => Scaffold(
            appBar: appBar,
            body: const Center(child: Text('home-body')),
          ),
        ),
        GoRoute(
          path: '/sub',
          builder: (_, __) => Scaffold(
            appBar: appBar,
            body: const Center(child: Text('sub-body')),
          ),
        ),
      ],
    );
    return MaterialApp.router(routerConfig: router);
  }
}

void main() {
  group('ModoAppBar', () {
    testWidgets('일반 페이지에서 뒤로가기와 홈 버튼이 모두 표시된다',
        (tester) async {
      await tester.pumpWidget(
        const _TestHarness(appBar: ModoAppBar(title: Text('테스트'))),
      );
      await tester.pumpAndSettle();

      expect(find.text('테스트'), findsOneWidget);
      expect(find.byTooltip('뒤로'), findsOneWidget);
      expect(find.byTooltip('홈으로'), findsOneWidget);
    });

    testWidgets('현재 경로가 /home이면 홈 버튼이 자동으로 숨겨진다',
        (tester) async {
      await tester.pumpWidget(
        const _TestHarness(
          initialLocation: '/home',
          appBar: ModoAppBar(title: Text('홈')),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('홈'), findsOneWidget);
      expect(find.byTooltip('홈으로'), findsNothing);
    });

    testWidgets('showBack=false 이면 뒤로가기 버튼이 숨겨진다',
        (tester) async {
      await tester.pumpWidget(
        const _TestHarness(
          appBar: ModoAppBar(title: Text('숨김'), showBack: false),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byTooltip('뒤로'), findsNothing);
      expect(find.byTooltip('홈으로'), findsOneWidget);
    });

    testWidgets('showHome=false 이면 홈 버튼이 숨겨진다',
        (tester) async {
      await tester.pumpWidget(
        const _TestHarness(
          appBar: ModoAppBar(title: Text('홈숨김'), showHome: false),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byTooltip('뒤로'), findsOneWidget);
      expect(find.byTooltip('홈으로'), findsNothing);
    });

    testWidgets('홈 버튼을 누르면 /home 으로 이동한다', (tester) async {
      await tester.pumpWidget(
        const _TestHarness(appBar: ModoAppBar(title: Text('이동'))),
      );
      await tester.pumpAndSettle();

      expect(find.text('sub-body'), findsOneWidget);
      await tester.tap(find.byTooltip('홈으로'));
      await tester.pumpAndSettle();

      expect(find.text('home-body'), findsOneWidget);
    });

    testWidgets('이전 페이지가 없는 상태에서 뒤로가기를 누르면 /home 으로 이동한다',
        (tester) async {
      await tester.pumpWidget(
        const _TestHarness(appBar: ModoAppBar(title: Text('낙오'))),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('뒤로'));
      await tester.pumpAndSettle();

      expect(find.text('home-body'), findsOneWidget);
    });

    testWidgets('actions 가 주어지면 홈 버튼과 함께 모두 표시된다',
        (tester) async {
      await tester.pumpWidget(
        _TestHarness(
          appBar: ModoAppBar(
            title: const Text('액션'),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh),
                tooltip: '새로고침',
                onPressed: () {},
              ),
            ],
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byTooltip('새로고침'), findsOneWidget);
      expect(find.byTooltip('홈으로'), findsOneWidget);
    });

    testWidgets('onBack 콜백이 우선 호출된다', (tester) async {
      var called = 0;
      await tester.pumpWidget(
        _TestHarness(
          appBar: ModoAppBar(
            title: const Text('콜백'),
            onBack: () => called++,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('뒤로'));
      await tester.pumpAndSettle();

      expect(called, 1);
      expect(find.text('sub-body'), findsOneWidget);
    });
  });
}
