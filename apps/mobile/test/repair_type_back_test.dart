import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/orders/presentation/widgets/repair_type_step.dart';

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
}
