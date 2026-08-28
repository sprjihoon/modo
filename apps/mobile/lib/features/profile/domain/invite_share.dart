const String kInviteSiteUrl = 'https://modo.io.kr';

String normalizeInviteCode(String? code) => (code ?? '').trim().toUpperCase();

String inviteSignupUrl(String inviteCode, {String baseUrl = kInviteSiteUrl}) {
  final code = normalizeInviteCode(inviteCode);
  return '$baseUrl/signup?invite=${Uri.encodeComponent(code)}';
}

/// 앱 로그인/가입 경로에 초대 코드를 유지한다.
String loginPathWithInvite(String? inviteCode) {
  final code = normalizeInviteCode(inviteCode);
  return code.isEmpty ? '/login' : '/login?invite=${Uri.encodeComponent(code)}';
}

String signupPathWithInvite(String? inviteCode) {
  final code = normalizeInviteCode(inviteCode);
  return code.isEmpty
      ? '/signup'
      : '/signup?invite=${Uri.encodeComponent(code)}';
}

/// 앱에서 여는 웹 가입 URL. 초대 코드가 있으면 쿼리로 넘긴다.
String webSignupHref(String? inviteCode, {String baseUrl = kInviteSiteUrl}) {
  final code = normalizeInviteCode(inviteCode);
  if (code.isEmpty) return '$baseUrl/signup';
  return inviteSignupUrl(code, baseUrl: baseUrl);
}

String buildInviteShareText({
  required String inviteCode,
  required int rewardAmount,
  required int inviteeRewardAmount,
  String baseUrl = kInviteSiteUrl,
}) {
  final code = normalizeInviteCode(inviteCode);
  final link = inviteSignupUrl(code, baseUrl: baseUrl);
  final inviter = _formatPoints(rewardAmount);
  final invitee = _formatPoints(inviteeRewardAmount);
  return '모두의수선 초대 코드: $code\n'
      '가입하면 서로 포인트 적립! (초대자 ${inviter}P / 가입자 ${invitee}P)\n'
      '$link';
}

String _formatPoints(int amount) {
  return amount.toString().replaceAllMapped(
    RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
    (match) => '${match[1]},',
  );
}
