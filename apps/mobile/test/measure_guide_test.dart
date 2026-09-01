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

    test('기장 줄임 + 바지 uses bottom guide', () {
      expect(
        resolveMeasureGuideId('기장 줄임', clothingHint: '바지'),
        'total-length-bottom',
      );
    });

    test('overrides stored top length when clothing is pants', () {
      expect(
        resolveMeasureGuideId(
          '기장 줄임',
          measureGuideKey: 'total-length-top',
          clothingHint: '바지',
        ),
        'total-length-bottom',
      );
    });

    test('청바지 uses bottom length guide', () {
      expect(
        resolveMeasureGuideId(
          '기장 줄임',
          measureGuideKey: 'total-length-top',
          clothingHint: '청바지',
        ),
        'total-length-bottom',
      );
    });

    test('치마 uses bottom length guide', () {
      expect(
        resolveMeasureGuideId(
          '기장 줄임',
          measureGuideKey: 'total-length-top',
          clothingHint: '치마',
        ),
        'total-length-bottom',
      );
    });

    test('스커트 uses bottom length guide', () {
      expect(
        resolveMeasureGuideId(
          '기장 줄임',
          measureGuideKey: 'total-length-top',
          clothingHint: '스커트',
        ),
        'total-length-bottom',
      );
    });

    test('overrides stored top length for 기장 줄임 일반형 + 바지', () {
      expect(
        resolveMeasureGuideId(
          '기장 줄임 - 일반형',
          measureGuideKey: 'total-length-top',
          clothingHint: '바지',
        ),
        'total-length-bottom',
      );
    });

    test('defaults 기장 줄임 to bottom when clothing is unknown', () {
      expect(resolveMeasureGuideId('기장 줄임'), 'total-length-bottom');
    });

    test('keeps top length when clothing is a top', () {
      expect(
        resolveMeasureGuideId('총기장 줄임', clothingHint: '상의'),
        'total-length-top',
      );
    });

    test('overrides stored bottom length when clothing is a top', () {
      expect(
        resolveMeasureGuideId(
          '총기장 줄임',
          measureGuideKey: 'total-length-bottom',
          clothingHint: '상의',
        ),
        'total-length-top',
      );
    });

    test('name wins over a wrong category key', () {
      expect(
        resolveMeasureGuideId(
          '어깨길이 줄임',
          measureGuideKey: 'sleeve-length',
          clothingHint: '티셔츠/맨투맨',
        ),
        'shoulder',
      );
      expect(
        resolveMeasureGuideId(
          '허리/밑 줄임',
          measureGuideKey: 'total-length-bottom',
          clothingHint: '바지',
        ),
        'waist-hip',
      );
      expect(
        resolveMeasureGuideId(
          '밑위(기장이) 줄임',
          measureGuideKey: 'total-length-top',
          clothingHint: '청바지',
        ),
        'rise',
      );
      expect(
        resolveMeasureGuideId(
          '밑통만 줄임',
          measureGuideKey: 'total-length-top',
          clothingHint: '바지',
        ),
        'leg-width',
      );
      expect(
        resolveMeasureGuideId(
          '기장+밑통 줄임',
          measureGuideKey: 'total-length-top',
          clothingHint: '바지',
        ),
        'length-leg-width',
      );
    });

    test('top clothing items keep top guides', () {
      for (final clothing in ['티셔츠/맨투맨', '셔츠/블라우스', '원피스', '아우터']) {
        expect(
          resolveMeasureGuideId('소매기장 줄임', clothingHint: clothing),
          'sleeve-length',
        );
        expect(
          resolveMeasureGuideId('전체팔통 줄임', clothingHint: clothing),
          'arm-width',
        );
        expect(
          resolveMeasureGuideId('어깨길이 줄임', clothingHint: clothing),
          'shoulder',
        );
        expect(
          resolveMeasureGuideId('전체품 줄임', clothingHint: clothing),
          'width-top',
        );
        expect(
          resolveMeasureGuideId('총기장 줄임', clothingHint: clothing),
          'total-length-top',
        );
      }
    });

    test('bottom clothing items keep bottom guides', () {
      for (final clothing in ['바지', '청바지', '치마']) {
        expect(
          resolveMeasureGuideId('허리/밑 줄임', clothingHint: clothing),
          'waist-hip',
        );
        expect(
          resolveMeasureGuideId('전체통 줄임', clothingHint: clothing),
          'leg-width',
        );
        expect(
          resolveMeasureGuideId('기장 줄임 - 일반형', clothingHint: clothing),
          'total-length-bottom',
        );
      }
    });

    test('suit mixes jacket and pants guides', () {
      expect(
        resolveMeasureGuideId('총기장 줄임', clothingHint: '정장/수트'),
        'total-length-top',
      );
      expect(
        resolveMeasureGuideId('기장 줄임 - 일반형', clothingHint: '정장/수트'),
        'total-length-bottom',
      );
      expect(
        resolveMeasureGuideId('소매기장 줄임', clothingHint: '정장/수트'),
        'sleeve-length',
      );
    });

    test('defaults 총기장 to top when clothing is unknown', () {
      expect(resolveMeasureGuideId('총기장 줄임'), 'total-length-top');
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

  group('MeasurementStep digits-only', () {
    testWidgets('rejects signs and decimal points', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MeasurementStep(
              config: const MeasurementStepConfig(
                itemName: '소매기장 줄임',
                labels: ['줄일 길이 (cm)'],
              ),
              onConfirm: (_) {},
              onBack: () {},
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.enterText(find.byType(TextField), '-12.5e+3');
      await tester.pump();

      expect(find.text('1253'), findsOneWidget);
      expect(find.text('-12.5e+3'), findsNothing);
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
