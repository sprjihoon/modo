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
}
