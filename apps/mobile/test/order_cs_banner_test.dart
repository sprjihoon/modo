import 'package:flutter_test/flutter_test.dart';

bool showCsBanner({
  required int cycle,
  String? csStatus,
  required bool hasEvents,
}) {
  return cycle > 1 || csStatus != null || hasEvents;
}

String? csBannerTitle({required int cycle, String? csStatus}) {
  if (csStatus == 'REPAIR_REFUNDED') return '수선비 환불 완료';
  if (csStatus == 'COMPENSATED') return '보상 처리됨';
  if (cycle > 1 || csStatus == 'REWORK') return '재작업 ${cycle}회차 진행 중';
  return null;
}

void main() {
  test('1회차이고 CS 없으면 배너 숨김', () {
    expect(showCsBanner(cycle: 1, csStatus: null, hasEvents: false), false);
  });

  test('재작업 회차는 배너 표시', () {
    expect(showCsBanner(cycle: 2, csStatus: 'REWORK', hasEvents: true), true);
    expect(csBannerTitle(cycle: 2, csStatus: 'REWORK'), '재작업 2회차 진행 중');
  });

  test('수선비 환불·보상은 배너 표시', () {
    expect(showCsBanner(cycle: 1, csStatus: 'REPAIR_REFUNDED', hasEvents: true), true);
    expect(csBannerTitle(cycle: 1, csStatus: 'REPAIR_REFUNDED'), '수선비 환불 완료');
    expect(csBannerTitle(cycle: 1, csStatus: 'COMPENSATED'), '보상 처리됨');
  });
}
