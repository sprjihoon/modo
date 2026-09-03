import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/core/widgets/system_nav_inset.dart';

void main() {
  testWidgets('키보드가 열려도 수거정보 입력창이 화면에 남는다', (tester) async {
    tester.view.physicalSize = const Size(400, 700);
    tester.view.devicePixelRatio = 1;
    tester.view.padding = FakeViewPadding.zero;
    tester.view.viewPadding = const FakeViewPadding(bottom: 48);
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      const MaterialApp(
        home: SystemNavInset(
          child: _PickupKeyboardHarness(),
        ),
      ),
    );

    expect(find.text('상세주소를 입력하세요'), findsOneWidget);
    expect(find.text('수거 정보 완료'), findsOneWidget);

    tester.view.viewInsets = const FakeViewPadding(bottom: 320);
    await tester.pump();

    expect(find.text('상세주소를 입력하세요'), findsOneWidget);
    final scrollSize = tester.getSize(find.byType(SingleChildScrollView));
    expect(scrollSize.height, greaterThan(200));
    expect(find.text('수거 정보 완료'), findsNothing);
  });
}

class _PickupKeyboardHarness extends StatelessWidget {
  const _PickupKeyboardHarness();

  @override
  Widget build(BuildContext context) {
    final keyboardOpen = MediaQuery.viewInsetsOf(context).bottom > 0;
    return Scaffold(
      resizeToAvoidBottomInset: true,
      appBar: AppBar(title: const Text('수거신청')),
      body: SafeArea(
        top: false,
        bottom: false,
        child: Column(
          children: [
            if (!keyboardOpen)
              const SizedBox(height: 52, child: Text('수거 정보')),
            const Expanded(
              child: SingleChildScrollView(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: TextField(
                    decoration: InputDecoration(hintText: '상세주소를 입력하세요'),
                  ),
                ),
              ),
            ),
            if (!keyboardOpen)
              const Padding(
                padding: EdgeInsets.all(20),
                child: SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: Text('수거 정보 완료'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
