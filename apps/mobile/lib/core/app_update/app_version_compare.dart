/// 스토어/설치 버전 비교. `1.0.2` 또는 `1.0.2+24` 형식을 받는다.
class VersionRef {
  const VersionRef(this.parts, this.build);

  final List<int> parts;
  final int build;

  factory VersionRef.parse(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) {
      return const VersionRef([0], 0);
    }
    final plus = trimmed.split('+');
    final versionPart = plus.first.trim();
    final build = plus.length > 1 ? int.tryParse(plus[1].trim()) ?? 0 : 0;
    final parts = versionPart
        .split('.')
        .map((e) => int.tryParse(e.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0)
        .toList();
    if (parts.isEmpty) {
      return VersionRef(const [0], build);
    }
    return VersionRef(parts, build);
  }

  /// 음수면 this < other, 0이면 같음, 양수면 this > other
  int compareTo(VersionRef other) {
    final n = parts.length > other.parts.length ? parts.length : other.parts.length;
    for (var i = 0; i < n; i++) {
      final a = i < parts.length ? parts[i] : 0;
      final b = i < other.parts.length ? other.parts[i] : 0;
      if (a != b) return a - b;
    }
    return build - other.build;
  }

  bool operator <(VersionRef other) => compareTo(other) < 0;
  bool operator >(VersionRef other) => compareTo(other) > 0;

  @override
  String toString() => '${parts.join('.')}+$build';
}

enum AppUpdateKind { none, soft, force }

class AppUpdateDecision {
  const AppUpdateDecision({
    required this.kind,
    required this.latestLabel,
    required this.message,
    required this.storeUrl,
  });

  final AppUpdateKind kind;
  final String latestLabel;
  final String message;
  final String storeUrl;

  static const none = AppUpdateDecision(
    kind: AppUpdateKind.none,
    latestLabel: '',
    message: '',
    storeUrl: '',
  );

  bool get shouldPrompt => kind != AppUpdateKind.none;
  bool get isForce => kind == AppUpdateKind.force;
}

AppUpdateDecision decideAppUpdate({
  required String installedVersion,
  String installedBuild = '0',
  required String latestVersion,
  required String minVersion,
  bool isForceUpdate = false,
  bool isActive = true,
  String updateMessage = '새로운 기능이 추가되었습니다. 업데이트해 주세요!',
  String storeUrl = '',
}) {
  if (!isActive) return AppUpdateDecision.none;

  final installed = VersionRef.parse(
    installedBuild.trim().isEmpty
        ? installedVersion
        : '$installedVersion+$installedBuild',
  );
  final latest = VersionRef.parse(latestVersion);
  final min = VersionRef.parse(minVersion);

  if (installed.compareTo(min) < 0) {
    return AppUpdateDecision(
      kind: AppUpdateKind.force,
      latestLabel: latestVersion,
      message: updateMessage,
      storeUrl: storeUrl,
    );
  }
  if (installed.compareTo(latest) >= 0) {
    return AppUpdateDecision.none;
  }
  return AppUpdateDecision(
    kind: isForceUpdate ? AppUpdateKind.force : AppUpdateKind.soft,
    latestLabel: latestVersion,
    message: updateMessage,
    storeUrl: storeUrl,
  );
}
