import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/profile/domain/invite_share.dart';

void main() {
  group('normalizeInviteCode', () {
    test('trims and uppercases', () {
      expect(normalizeInviteCode('  modoab  '), 'MODOAB');
    });

    test('empty and null become empty', () {
      expect(normalizeInviteCode(null), '');
      expect(normalizeInviteCode('   '), '');
    });
  });

  group('inviteSignupUrl', () {
    test('builds signup link with encoded code', () {
      expect(
        inviteSignupUrl('MODO12AB'),
        'https://modo.io.kr/signup?invite=MODO12AB',
      );
    });
  });

  group('buildInviteShareText', () {
    test('includes code, points, and signup link', () {
      final text = buildInviteShareText(
        inviteCode: 'modo12ab',
        rewardAmount: 1000,
        inviteeRewardAmount: 2000,
      );
      expect(text, contains('초대 코드: MODO12AB'));
      expect(text, contains('초대자 1,000P'));
      expect(text, contains('가입자 2,000P'));
      expect(text, contains('https://modo.io.kr/signup?invite=MODO12AB'));
    });
  });
}
