import 'package:shared_preferences/shared_preferences.dart';

import 'invite_share.dart';

/// 웹 `modo_invite_code` 쿠키/localStorage와 같은 키
const kInviteStashKey = 'modo_invite_code';

Future<void> stashInviteCode(
  String? code, {
  SharedPreferences? prefs,
}) async {
  final normalized = normalizeInviteCode(code);
  if (normalized.isEmpty) return;
  final store = prefs ?? await SharedPreferences.getInstance();
  await store.setString(kInviteStashKey, normalized);
}

Future<String> readStashedInviteCode({SharedPreferences? prefs}) async {
  final store = prefs ?? await SharedPreferences.getInstance();
  return normalizeInviteCode(store.getString(kInviteStashKey));
}

Future<void> clearStashedInviteCode({SharedPreferences? prefs}) async {
  final store = prefs ?? await SharedPreferences.getInstance();
  await store.remove(kInviteStashKey);
}

/// 적용 성공·더 이상 쓸 수 없는 코드면 스태시를 지운다.
bool shouldClearInviteStash({required bool ok, String? reason}) {
  return ok ||
      reason == 'already_applied' ||
      reason == 'invalid_code' ||
      reason == 'self_invite';
}
