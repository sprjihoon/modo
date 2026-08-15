/// 이메일/비밀번호 계정이면 비밀번호 변경 UI를 연다.
bool canChangePasswordFromProviders(Iterable<String> providers) {
  return providers.contains('email');
}
