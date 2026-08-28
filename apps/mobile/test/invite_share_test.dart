import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/profile/domain/invite_share.dart';
import 'package:modu_repair/features/profile/domain/invite_stash.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

  group('loginPathWithInvite / signupPathWithInvite', () {
    test('omits query when empty', () {
      expect(loginPathWithInvite(null), '/login');
      expect(loginPathWithInvite('  '), '/login');
      expect(signupPathWithInvite(''), '/signup');
    });

    test('keeps normalized invite on login and signup paths', () {
      expect(loginPathWithInvite(' modoab '), '/login?invite=MODOAB');
      expect(signupPathWithInvite('modo12ab'), '/signup?invite=MODO12AB');
    });
  });

  group('webSignupHref', () {
    test('opens web signup without code', () {
      expect(webSignupHref(null), 'https://modo.io.kr/signup');
      expect(webSignupHref('  '), 'https://modo.io.kr/signup');
    });

    test('keeps invite on the public web signup url', () {
      expect(
        webSignupHref('modo12ab'),
        'https://modo.io.kr/signup?invite=MODO12AB',
      );
    });
  });

  group('invite stash', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('stashes normalized code and can be read then cleared', () async {
      await stashInviteCode('  modoab  ');
      expect(await readStashedInviteCode(), 'MODOAB');
      await clearStashedInviteCode();
      expect(await readStashedInviteCode(), '');
    });

    test('ignores empty stash writes', () async {
      await stashInviteCode('MODOAB');
      await stashInviteCode('   ');
      expect(await readStashedInviteCode(), 'MODOAB');
    });

    test('clears stash after success or terminal apply reasons', () {
      expect(shouldClearInviteStash(ok: true, reason: null), isTrue);
      expect(
        shouldClearInviteStash(ok: false, reason: 'already_applied'),
        isTrue,
      );
      expect(
        shouldClearInviteStash(ok: false, reason: 'invalid_code'),
        isTrue,
      );
      expect(
        shouldClearInviteStash(ok: false, reason: 'self_invite'),
        isTrue,
      );
      expect(
        shouldClearInviteStash(ok: false, reason: 'server_error'),
        isFalse,
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
