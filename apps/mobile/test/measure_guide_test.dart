import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/core/measure_guide.dart';
import 'package:modu_repair/features/orders/presentation/widgets/measure_guide_accordion.dart';
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

    test('expands composite guide ids', () {
      expect(
        expandMeasureGuideTypeIds('length-leg-width'),
        ['total-length-bottom', 'leg-width'],
      );
    });

    test('locks allowed types to the selected guide', () {
      final allowed = allowedMeasureGuideTypes('sleeve-length');
      expect(allowed.map((t) => t.id), ['sleeve-length']);
    });
  });

  group('parseMeasureGuideHeightMessage', () {
    test('accepts a shorter tab height after a taller one', () {
      expect(
        parseMeasureGuideHeightMessage('1180', current: 1180),
        1180,
      );
      expect(
        parseMeasureGuideHeightMessage('640', current: 1180),
        640,
      );
    });

    test('ignores jitter under 8px', () {
      expect(
        parseMeasureGuideHeightMessage('645', current: 640),
        640,
      );
    });

    test('rejects tiny values', () {
      expect(parseMeasureGuideHeightMessage('12'), isNull);
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

    testWidgets('ListView can scroll so 치수 재는 방법 is reachable', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MeasurementStep(
              config: const MeasurementStepConfig(
                itemName: '소매기장 줄임',
                labels: ['줄일 길이 (cm)'],
                notes: '가이드가 잘리지 않도록 입력 화면을 스크롤할 수 있어야 합니다.\n'
                    '두번째 안내\n세번째 안내\n네번째 안내',
                measureGuideKey: 'sleeve-length',
              ),
              onConfirm: (_) {},
              onBack: () {},
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(ListView), findsOneWidget);
      expect(find.text('치수 재는 방법'), findsOneWidget);
      await tester.drag(find.byType(ListView), const Offset(0, -240));
      await tester.pump();
      expect(find.text('치수 재는 방법'), findsOneWidget);
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

  group('MeasureGuideAccordion', () {
    testWidgets('shows compare method by default like the web', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: MeasureGuideAccordion(initialTypeId: 'sleeve-length'),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('치수 재는 방법'), findsOneWidget);
      expect(find.text('잘맞는 옷과 비교 방법'), findsOneWidget);
      expect(find.text('일상적인 방법'), findsOneWidget);
      expect(find.text('잘 맞는 옷과 비교하는 방법'), findsOneWidget);
      expect(find.text('준비물'), findsOneWidget);
      expect(find.text('소매기장 줄임'), findsOneWidget);
      expect(find.text('소매 기장 측정'), findsNothing);
    });

    testWidgets('daily tab shows type-specific everyday guide', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: MeasureGuideAccordion(initialTypeId: 'sleeve-length'),
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('일상적인 방법'));
      await tester.pumpAndSettle();

      expect(find.text('소매 기장 측정'), findsOneWidget);
      expect(find.text('전체 팔통 측정'), findsOneWidget);
      expect(find.text('어깨 길이 측정'), findsNothing);
      expect(find.text('잘 맞는 옷과 비교하는 방법'), findsNothing);
    });
  });
}
