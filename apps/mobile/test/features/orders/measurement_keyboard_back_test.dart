import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/orders/presentation/widgets/measurement_step.dart';

void main() {
  testWidgets('키보드가 열린 채 이전을 누르면 단계는 유지되고 키패드만 닫힌다', (tester) async {
    tester.view.physicalSize = const Size(400, 800);
    tester.view.devicePixelRatio = 1;
    tester.view.viewInsets = const FakeViewPadding(bottom: 300);
    addTearDown(tester.view.reset);

    var backed = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MeasurementStep(
            config: const MeasurementStepConfig(
              itemName: '바지 기장',
              labels: ['기장'],
            ),
            onConfirm: (_) {},
            onBack: () => backed = true,
          ),
        ),
      ),
    );

    await tester.tap(find.byType(TextField));
    await tester.pump();
    expect(find.text('완료'), findsOneWidget);

    await tester.tap(find.text('이전'));
    await tester.pump();
    expect(backed, isFalse);
    expect(find.text('치수를 입력해주세요'), findsOneWidget);
  });
}
