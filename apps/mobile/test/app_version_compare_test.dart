import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/core/app_update/app_version_compare.dart';

void main() {
  test('1.0과 1.0.0은 같다', () {
    expect(VersionRef.parse('1.0').compareTo(VersionRef.parse('1.0.0')), 0);
  });

  test('1.0.2는 1.0보다 높다', () {
    expect(VersionRef.parse('1.0.2').compareTo(VersionRef.parse('1.0')),
        greaterThan(0));
  });

  test('같은 버전에서 빌드 번호로 비교한다', () {
    expect(
      VersionRef.parse('1.0.2+24').compareTo(VersionRef.parse('1.0.2+21')),
      greaterThan(0),
    );
  });

  test('최신보다 낮으면 권장 업데이트', () {
    final d = decideAppUpdate(
      installedVersion: '1.0',
      installedBuild: '21',
      latestVersion: '1.0.2',
      minVersion: '1.0.0',
    );
    expect(d.kind, AppUpdateKind.soft);
  });

  test('최소 버전 미만이면 강제 업데이트', () {
    final d = decideAppUpdate(
      installedVersion: '1.0',
      installedBuild: '21',
      latestVersion: '1.0.2',
      minVersion: '1.0.2',
    );
    expect(d.kind, AppUpdateKind.force);
  });

  test('강제 플래그가 켜져 있으면 최신 미만은 강제', () {
    final d = decideAppUpdate(
      installedVersion: '1.0',
      latestVersion: '1.0.2',
      minVersion: '0.9.0',
      isForceUpdate: true,
    );
    expect(d.kind, AppUpdateKind.force);
  });

  test('이미 최신이면 안내하지 않는다', () {
    final d = decideAppUpdate(
      installedVersion: '1.0.2',
      installedBuild: '24',
      latestVersion: '1.0.2',
      minVersion: '1.0.0',
    );
    expect(d.kind, AppUpdateKind.none);
  });

  test('비활성이면 안내하지 않는다', () {
    final d = decideAppUpdate(
      installedVersion: '1.0',
      latestVersion: '1.0.2',
      minVersion: '1.0.0',
      isActive: false,
    );
    expect(d.kind, AppUpdateKind.none);
  });

  test('라이브 시드: 아이폰 1.0 빌드 21은 최신 1.0과 같으므로 안내 없음', () {
    final d = decideAppUpdate(
      installedVersion: '1.0',
      installedBuild: '21',
      latestVersion: '1.0',
      minVersion: '1.0.0',
    );
    expect(d.kind, AppUpdateKind.none);
  });

  test('라이브 시드: 안드로이드 1.0.1 빌드 21은 최신 1.0.1과 같으므로 안내 없음', () {
    final d = decideAppUpdate(
      installedVersion: '1.0.1',
      installedBuild: '21',
      latestVersion: '1.0.1',
      minVersion: '1.0.0',
    );
    expect(d.kind, AppUpdateKind.none);
  });

  test('최신이 1.0.2+24면 같은 버전의 낮은 빌드는 권장 업데이트', () {
    final d = decideAppUpdate(
      installedVersion: '1.0.2',
      installedBuild: '21',
      latestVersion: '1.0.2+24',
      minVersion: '1.0.0',
    );
    expect(d.kind, AppUpdateKind.soft);
  });

  test('최신이 빌드 없이 1.0.2면 1.0.2 설치본은 안내 없음', () {
    final d = decideAppUpdate(
      installedVersion: '1.0.2',
      installedBuild: '24',
      latestVersion: '1.0.2',
      minVersion: '1.0.0',
    );
    expect(d.kind, AppUpdateKind.none);
  });
}
