import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/core/auth/guest_access.dart';
import 'package:modu_repair/core/auth/password_account.dart';

void main() {
  group('isPublicPath', () {
    test('비회원이 볼 수 있는 화면은 public', () {
      expect(isPublicPath('/'), isTrue);
      expect(isPublicPath('/home'), isTrue);
      expect(isPublicPath('/login'), isTrue);
      expect(isPublicPath('/price-guide'), isTrue);
      expect(isPublicPath('/easy-guide'), isTrue);
      expect(isPublicPath('/profile'), isTrue);
      expect(isPublicPath('/profile/notices'), isTrue);
      expect(isPublicPath('/profile/customer-service'), isTrue);
      expect(isPublicPath('/profile/faq'), isTrue);
      expect(isPublicPath('/profile/settings'), isTrue);
      expect(isPublicPath('/terms'), isTrue);
      expect(isPublicPath('/privacy-policy'), isTrue);
    });

    test('계정 기능은 public이 아님', () {
      expect(isPublicPath('/order-flow'), isFalse);
      expect(isPublicPath('/cart'), isFalse);
      expect(isPublicPath('/orders'), isFalse);
      expect(isPublicPath('/orders/abc'), isFalse);
      expect(isPublicPath('/pickup-request'), isFalse);
      expect(isPublicPath('/payment'), isFalse);
      expect(isPublicPath('/notifications'), isFalse);
      expect(isPublicPath('/complete-profile'), isFalse);
      expect(isPublicPath('/profile/account'), isFalse);
      expect(isPublicPath('/profile/addresses'), isFalse);
      expect(isPublicPath('/profile/payment-history'), isFalse);
    });
  });

  group('safeReturnPath', () {
    test('앱 내부 경로만 허용', () {
      expect(safeReturnPath('/order-flow'), '/order-flow');
      expect(safeReturnPath('/cart'), '/cart');
      expect(safeReturnPath('/profile'), '/profile');
    });

    test('open redirect와 로그인 루프를 막음', () {
      expect(safeReturnPath(null), isNull);
      expect(safeReturnPath(''), isNull);
      expect(safeReturnPath('https://evil.com'), isNull);
      expect(safeReturnPath('//evil.com'), isNull);
      expect(safeReturnPath('/login'), isNull);
      expect(safeReturnPath('/login?from=/cart'), isNull);
      expect(safeReturnPath('/signup'), isNull);
    });
  });

  group('resolvePostAuthRoute', () {
    test('프로필 미완료면 복귀 경로보다 추가정보 입력이 우선', () {
      expect(
        resolvePostAuthRoute(
          profileCompleted: false,
          from: '/order-flow',
        ),
        '/complete-profile',
      );
    });

    test('프로필 완료면 from으로 복귀', () {
      expect(
        resolvePostAuthRoute(
          profileCompleted: true,
          from: '/order-flow',
        ),
        '/order-flow',
      );
    });

    test('from이 없으면 홈', () {
      expect(
        resolvePostAuthRoute(profileCompleted: true, from: null),
        '/home',
      );
    });
  });

  group('canChangePasswordFromProviders', () {
    test('이메일 계정이면 변경 가능', () {
      expect(canChangePasswordFromProviders(['email']), isTrue);
      expect(canChangePasswordFromProviders(['email', 'apple']), isTrue);
    });

    test('소셜만 있으면 변경 불가', () {
      expect(canChangePasswordFromProviders(['apple']), isFalse);
      expect(canChangePasswordFromProviders(['google', 'kakao']), isFalse);
      expect(canChangePasswordFromProviders(const []), isFalse);
    });
  });
}
