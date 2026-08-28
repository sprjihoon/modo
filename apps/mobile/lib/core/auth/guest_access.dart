import 'package:supabase_flutter/supabase_flutter.dart';

/// 비회원도 볼 수 있는 화면 (Guideline 5.1.1(v))
const publicExactPaths = {
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/terms',
  '/privacy-policy',
  '/permission-onboarding',
  '/home',
  '/price-guide',
  '/easy-guide',
  '/content-view',
  '/profile',
  '/profile/notices',
  '/profile/customer-service',
  '/profile/faq',
  '/profile/settings',
};

bool isPublicPath(String path) =>
    publicExactPaths.contains(path) ||
    path == '/announcements' ||
    path.startsWith('/announcements/');

bool isSignedIn() => Supabase.instance.client.auth.currentUser != null;

/// 비회원이 계정 기능에 들어가면 로그인으로 보냄. 로그인 후 `from`으로 복귀.
String? guestAuthRedirect(String path, {String? fullLocation}) {
  if (isSignedIn()) return null;
  if (isPublicPath(path)) return null;
  final from = Uri.encodeComponent(fullLocation ?? path);
  return '/login?from=$from';
}

/// 로그인 후 복귀 경로. open redirect 방지.
String? safeReturnPath(String? from) {
  if (from == null || from.isEmpty) return null;
  if (!from.startsWith('/') || from.startsWith('//')) return null;
  if (from.startsWith('/login') || from.startsWith('/signup')) return null;
  return from;
}

/// 로그인·OAuth 완료 후 이동 경로. 프로필 미완료가 최우선.
String resolvePostAuthRoute({
  required bool profileCompleted,
  String? from,
}) {
  if (!profileCompleted) return '/complete-profile';
  return safeReturnPath(from) ?? '/home';
}
