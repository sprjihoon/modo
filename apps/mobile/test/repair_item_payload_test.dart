import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/orders/domain/models/order_draft.dart';
import 'package:modu_repair/features/orders/domain/repair_item_payload.dart';
import 'package:modu_repair/features/orders/presentation/widgets/measurement_step.dart';

void main() {
  group('repairItemDetail', () {
    test('uses new-flow detail first', () {
      expect(
        repairItemDetail({
          'name': '소매기장 줄임',
          'detail': '줄일 길이 (cm): 3',
          'scope': '전체',
        }),
        '줄일 길이 (cm): 3',
      );
    });

    test('ignores blank detail', () {
      expect(
        repairItemDetail({'name': '단추달기', 'detail': '  '}),
        isNull,
      );
    });

    test('falls back to old-flow scope/measurement/parts', () {
      expect(
        repairItemDetail({
          'repairPart': '어깨줄임',
          'scope': '전체',
          'measurement': '{왼쪽: 2}',
          'selectedParts': ['왼쪽어깨', '오른쪽어깨'],
        }),
        '전체 / {왼쪽: 2} / 부위: 왼쪽어깨, 오른쪽어깨',
      );
    });

    test('direct-price category measurement', () {
      expect(
        repairItemDetail({
          'name': '기장 줄임',
          'detail': '줄일 길이 (cm): 4',
        }),
        '줄일 길이 (cm): 4',
      );
    });

    test('repair type without sub-parts', () {
      expect(
        toQuoteRepairItem({
          'name': '소매기장 줄임',
          'price': 15000,
          'detail': '줄일 길이 (cm): 3',
        })['detail'],
        '줄일 길이 (cm): 3',
      );
    });

    test('repair type + all option measurement', () {
      expect(
        toQuoteRepairItem({
          'name': '어깨줄임',
          'price': 20000,
          'detail': '왼쪽어깨 (cm): 1, 오른쪽어깨 (cm): 1',
        })['detail'],
        '왼쪽어깨 (cm): 1, 오른쪽어깨 (cm): 1',
      );
    });

    test('repair type + specific parts each keep their own detail', () {
      final left = toQuoteRepairItem({
        'name': '어깨줄임 - 왼쪽어깨',
        'price': 12000,
        'detail': '줄일 길이 (cm): 2',
      });
      final right = toQuoteRepairItem({
        'name': '어깨줄임 - 오른쪽어깨',
        'price': 12000,
        'detail': '줄일 길이 (cm): 1.5',
      });
      expect(left['detail'], '줄일 길이 (cm): 2');
      expect(right['detail'], '줄일 길이 (cm): 1.5');
    });

    test('old detailedMeasurements single value', () {
      expect(
        repairItemDetail({
          'repairPart': '어깨줄임',
          'detailedMeasurements': [
            {'part': '왼쪽어깨', 'value': '2'},
          ],
        }),
        '왼쪽어깨: 2',
      );
    });

    test('old detailedMeasurements multi-label parts', () {
      expect(
        repairItemDetail({
          'repairPart': '허리/힙 줄임',
          'detailedMeasurements': [
            {
              'part': '허리',
              'values': [
                {'label': '줄일 길이 (cm)', 'value': '3'},
              ],
            },
          ],
        }),
        '허리 (줄일 길이 (cm): 3)',
      );
    });
  });

  group('quote and repair_parts payload', () {
    test('quote item keeps customer measurement for work sheet', () {
      final quote = toQuoteRepairItem({
        'repairPart': '소매기장 줄임',
        'price': 15000,
        'detail': '줄일 길이 (cm): 3',
      });

      expect(quote['name'], '소매기장 줄임');
      expect(quote['price'], 15000);
      expect(quote['quantity'], 1);
      expect(quote['detail'], '줄일 길이 (cm): 3');
    });

    test('missing measurement is omitted, not empty string', () {
      final quote = toQuoteRepairItem({'name': '단추달기', 'price': 5000});
      expect(quote.containsKey('detail'), isFalse);
    });

    test('repair_parts JSON is what admin parseRepairPart reads', () {
      final raw = toRepairPartJson({
        'name': '허리줄임',
        'price': 12000,
        'detail': '허리: 30',
      });
      final parsed = jsonDecode(raw) as Map<String, dynamic>;

      expect(parsed['name'], '허리줄임');
      expect(parsed['price'], 12000);
      expect(parsed['detail'], '허리: 30');
    });

    test('old-flow fields still become quote detail', () {
      final quote = toQuoteRepairItem({
        'repairPart': '어깨줄임',
        'price': 15000,
        'scope': '전체',
        'measurement': '왼쪽: 2',
      });
      expect(quote['detail'], '전체 / 왼쪽: 2');
    });

    test('measurementLinesFromParts reads JSON repair_parts', () {
      final lines = measurementLinesFromParts([
        toRepairPartJson({
          'name': '소매기장 줄임',
          'price': 15000,
          'detail': '줄일 길이 (cm): 3',
        }),
        '단추달기',
      ]);
      expect(lines.length, 1);
      expect(lines.first.name, '소매기장 줄임');
      expect(lines.first.detail, '줄일 길이 (cm): 3');
    });

    test('payment intent repairParts objects keep measurements', () {
      final lines = measurementLinesFromParts([
        {
          'name': '소매기장 줄임',
          'price': 15000,
          'quantity': 1,
          'detail': '줄일 길이 (cm): 3',
        },
      ]);
      expect(lines.single.detail, '줄일 길이 (cm): 3');
    });
  });

  group('order draft to pickup extra', () {
    test('RepairItem.detail survives toJson and pickup mapping', () {
      const item = RepairItem(
        name: '소매기장 줄임',
        price: 15000,
        priceRange: '15,000원',
        quantity: 1,
        detail: '줄일 길이 (cm): 3',
      );

      expect(item.toJson()['detail'], '줄일 길이 (cm): 3');

      final pickupItem = {
        'name': item.name,
        'repairPart': item.name,
        'price': item.price,
        'priceRange': item.priceRange,
        'quantity': item.quantity,
        if (item.detail != null) 'detail': item.detail,
      };
      expect(toQuoteRepairItem(pickupItem)['detail'], '줄일 길이 (cm): 3');
    });
  });

  group('MeasurementStep confirm', () {
    testWidgets('passes entered values that become work-sheet detail',
        (tester) async {
      List<String>? confirmed;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MeasurementStep(
              config: const MeasurementStepConfig(
                itemName: '소매기장 줄임',
                labels: ['줄일 길이 (cm)'],
                measureGuideKey: 'sleeve-length',
              ),
              onConfirm: (values) => confirmed = values,
              onBack: () {},
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.enterText(find.byType(TextField), '3');
      await tester.pump();
      await tester.tap(find.widgetWithText(ElevatedButton, '확인'));
      await tester.pump();

      expect(confirmed, ['3']);

      const labels = ['줄일 길이 (cm)'];
      final detail = labels.asMap().entries.map((entry) {
        final value = entry.key < confirmed!.length && confirmed![entry.key].isNotEmpty
            ? confirmed![entry.key]
            : '-';
        return '${entry.value}: $value';
      }).join(', ');

      expect(
        toQuoteRepairItem({
          'name': '소매기장 줄임',
          'price': 15000,
          'detail': detail,
        })['detail'],
        '줄일 길이 (cm): 3',
      );
    });
  });
}
