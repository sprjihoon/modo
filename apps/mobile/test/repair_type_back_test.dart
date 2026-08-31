import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/orders/presentation/widgets/repair_type_step.dart';
import 'package:modu_repair/features/orders/presentation/widgets/sub_category_step.dart';

void main() {
  test('항목이 하나면 수치 이전은 그리드를 건너뛴다', () {
    expect(
      shouldLeaveRepairTypeOnMeasureBack(
        repairTypeCount: 1,
        hasSubPartsView: false,
      ),
      isTrue,
    );
  });

  test('세부 부위가 남아 있으면 수치 이전은 그 화면으로 돌아간다', () {
    expect(
      shouldLeaveRepairTypeOnMeasureBack(
        repairTypeCount: 1,
        hasSubPartsView: true,
      ),
      isFalse,
    );
  });

  test('항목이 여러 개면 수치 이전은 목록으로 돌아간다', () {
    expect(
      shouldLeaveRepairTypeOnMeasureBack(
        repairTypeCount: 3,
        hasSubPartsView: false,
      ),
      isFalse,
    );
  });

  test('단일 선택 세부부위는 탭 즉시 확인한다', () {
    expect(
      shouldAutoConfirmOnSubPartTap(allowMultipleSubParts: false),
      isTrue,
    );
    expect(
      shouldAutoConfirmOnSubPartTap(allowMultipleSubParts: true),
      isFalse,
    );
  });

  test('전체 선택일 때만 전체 옵션 가격을 보여준다', () {
    expect(
      resolveAllOptionDisplayPrice(
        selectedMode: 'all',
        allOptionPrice: 15000,
        typePrice: 8000,
      ),
      15000,
    );
    expect(
      resolveAllOptionDisplayPrice(
        selectedMode: 'specific',
        allOptionPrice: 15000,
        typePrice: 8000,
      ),
      isNull,
    );
    expect(
      resolveAllOptionDisplayPrice(
        selectedMode: 'all',
        allOptionPrice: null,
        typePrice: 8000,
      ),
      8000,
    );
    expect(
      resolveAllOptionDisplayPrice(
        selectedMode: 'all',
        allOptionPrice: 0,
        typePrice: 0,
      ),
      isNull,
    );
  });

  test('치수 화면이 열려 있으면 세부부위보다 먼저 보여 준다', () {
    expect(
      resolveRepairTypeStepLayer(
        hasMeasureView: true,
        hasSubPartsView: true,
      ),
      RepairTypeStepLayer.measure,
    );
    expect(
      resolveRepairTypeStepLayer(
        hasMeasureView: false,
        hasSubPartsView: true,
      ),
      RepairTypeStepLayer.subParts,
    );
    expect(
      resolveRepairTypeStepLayer(
        hasMeasureView: false,
        hasSubPartsView: false,
      ),
      RepairTypeStepLayer.grid,
    );
  });

  test('수선항목 1개면 선택 완료 후 자동 다음', () {
    expect(
      shouldAutoProceedAfterRepairSelection(
        repairTypeCount: 1,
        selectedCount: 1,
        hasSubPartsView: false,
        hasMeasureView: false,
      ),
      isTrue,
    );
    expect(
      shouldAutoProceedAfterRepairSelection(
        repairTypeCount: 1,
        selectedCount: 1,
        hasSubPartsView: true,
        hasMeasureView: false,
      ),
      isFalse,
    );
  });

  test('허리+힙는 부위 라벨 2개를 쓰고 허리는 상위 라벨을 따른다', () {
    expect(
      resolvePartInputLabels(
        inputCount: 2,
        inputLabels: const ['허리 (cm)', '힙 (cm)'],
        fallback: const ['줄일 길이 (cm)'],
      ),
      ['허리 (cm)', '힙 (cm)'],
    );
    expect(
      resolvePartInputLabels(
        inputCount: 1,
        inputLabels: const [],
        fallback: const ['줄일 길이 (cm)'],
      ),
      ['줄일 길이 (cm)'],
    );
  });

  test('앱 치수 칸은 운영 media 행과 같은 맵을 읽는다', () {
    const fallback = ['줄일 길이 (cm)'];
    final combo = SubPartMeasureInput.fromRow({
      'name': '허리+힙',
      'input_count': 2,
      'input_labels': ['허리 (cm)', '힙 (cm)'],
    });
    final waist = SubPartMeasureInput.fromRow({
      'name': '허리',
      'input_count': 1,
      'input_labels': null,
    });
    final hip = SubPartMeasureInput.fromRow({
      'name': '힙',
      'input_count': 1,
      'input_labels': <dynamic>[],
    });

    final comboGroups = buildPartMeasureLabelGroups(
      fallbackLabels: fallback,
      parts: [combo],
    );
    expect(comboGroups, [
      ['허리 (cm)', '힙 (cm)'],
    ]);
    expect(measureFieldCount(comboGroups), 2);
    expect(
      measureDetailsForGroups(comboGroups, ['3', '2']),
      ['허리 (cm): 3, 힙 (cm): 2'],
    );

    final waistGroups = buildPartMeasureLabelGroups(
      fallbackLabels: fallback,
      parts: [waist],
    );
    expect(waistGroups, [
      ['줄일 길이 (cm)'],
    ]);
    expect(measureFieldCount(waistGroups), 1);

    final mixed = buildPartMeasureLabelGroups(
      fallbackLabels: fallback,
      parts: [combo, waist, hip],
    );
    expect(measureFieldCount(mixed), 4);
    expect(
      measureDetailsForGroups(mixed, ['3', '2', '1', '4']),
      [
        '허리 (cm): 3, 힙 (cm): 2',
        '줄일 길이 (cm): 1',
        '줄일 길이 (cm): 4',
      ],
    );
  });

  test('전체 선택처럼 부위가 없으면 상위 라벨만 쓴다', () {
    final groups = buildPartMeasureLabelGroups(
      fallbackLabels: const ['줄일 길이 (cm)'],
    );
    expect(groups, [
      ['줄일 길이 (cm)'],
    ]);
    expect(measureDetailFromValues(groups.first, [''], 0), '줄일 길이 (cm): -');
  });

  test('운영 허리/힙 줄임 행을 그대로 넣으면 칸 수가 맞는다', () {
    const typeLabels = ['치수 (cm)'];
    final combo = SubPartMeasureInput.fromRow({
      'name': '허리+힙',
      'input_count': 2,
      'input_labels': ['허리 (cm)', '힙 (cm)'],
    });
    final waist = SubPartMeasureInput.fromRow({
      'name': '허리',
      'input_count': 1,
      'input_labels': null,
    });
    final hip = SubPartMeasureInput.fromRow({
      'name': '힙',
      'input_count': 1,
      'input_labels': null,
    });

    expect(
      measureFieldCount(
        buildPartMeasureLabelGroups(fallbackLabels: typeLabels, parts: [combo]),
      ),
      2,
    );
    expect(
      buildPartMeasureLabelGroups(fallbackLabels: typeLabels, parts: [waist]),
      [
        ['치수 (cm)'],
      ],
    );
    expect(
      buildPartMeasureLabelGroups(fallbackLabels: typeLabels, parts: [hip]),
      [
        ['치수 (cm)'],
      ],
    );
    expect(
      measureFieldCount(
        buildPartMeasureLabelGroups(fallbackLabels: typeLabels),
      ),
      1,
    );
  });
}
