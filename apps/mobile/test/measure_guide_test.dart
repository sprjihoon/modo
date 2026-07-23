import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/core/measure_guide.dart';
import 'package:modu_repair/features/orders/presentation/widgets/measurement_step.dart';

void main() {
  group('resolveMeasureGuideId', () {
    test('uses DB key when valid', () {
      expect(
        resolveMeasureGuideId('아무거나', measureGuideKey: 'sleeve-length'),
        'sleeve-length',
      );
    });

    test('infers sleeve length from name', () {
      expect(resolveMeasureGuideId('소매기장 줄임'), 'sleeve-length');
    });

    test('infers bottom length from clothing hint', () {
      expect(
        resolveMeasureGuideId('총기장 줄임', clothingHint: '바지'),
        'total-length-bottom',
      );
    });

    test('builds embed url with type', () {
      final url = measureGuideEmbedUrl('shoulder');
      expect(url, contains('modo.io.kr/guide/measure'));
      expect(url, contains('embed=1'));
      expect(url, contains('type=shoulder'));
    });
  });

  group('MeasurementStep layout', () {
    testWidgets('이전/확인 appear above 치수 재는 방법', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MeasurementStep(
              config: const MeasurementStepConfig(
                itemName: '소매기장 줄임',
                labels: ['줄일 길이 (cm)'],
                measureGuideKey: 'sleeve-length',
              ),
              onConfirm: (_) {},
              onBack: () {},
            ),
          ),
        ),
      );
      await tester.pump();

      final prev = find.text('이전');
      final confirm = find.text('확인');
      final guide = find.text('치수 재는 방법');

      expect(prev, findsOneWidget);
      expect(confirm, findsOneWidget);
      expect(guide, findsOneWidget);

      final prevY = tester.getTopLeft(prev).dy;
      final confirmY = tester.getTopLeft(confirm).dy;
      final guideY = tester.getTopLeft(guide).dy;

      expect(prevY, lessThan(guideY));
      expect(confirmY, lessThan(guideY));
    });

    testWidgets('confirm disabled until value entered', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MeasurementStep(
              config: const MeasurementStepConfig(
                itemName: '어깨길이 줄임',
                labels: ['줄일 길이 (cm)'],
              ),
              onConfirm: (_) {},
              onBack: () {},
            ),
          ),
        ),
      );
      await tester.pump();

      final confirmBtn = tester.widget<ElevatedButton>(
        find.widgetWithText(ElevatedButton, '확인'),
      );
      expect(confirmBtn.onPressed, isNull);

      await tester.enterText(find.byType(TextField), '3');
      await tester.pump();

      final enabled = tester.widget<ElevatedButton>(
        find.widgetWithText(ElevatedButton, '확인'),
      );
      expect(enabled.onPressed, isNotNull);
    });
  });
}
