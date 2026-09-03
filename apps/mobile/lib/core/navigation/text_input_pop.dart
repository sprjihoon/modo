import 'package:flutter/widgets.dart';

/// 입력창 포커스/키보드와 시스템 뒤로가기를 구분한다.
///
/// Android에서 TextField를 탭하면 IME 연결 과정에서 PopScope가
/// 같이 호출되는 경우가 있다. 그때 페이지를 닫으면 흰 화면 뒤에
/// 이전 단계가 남는 것처럼 보인다.
enum TextInputPopAction {
  /// 키보드가 열려 있음 → 먼저 닫고 페이지는 유지
  unfocus,

  /// 입력창만 포커스된 상태(IME 부착 직후) → 무시하고 포커스 유지
  ignore,

  /// 입력과 무관한 뒤로가기 → 페이지 이탈 처리
  leave,
}

TextInputPopAction textInputPopAction({
  required double viewInsetsBottom,
  required bool hasEditableFocus,
}) {
  if (viewInsetsBottom > 0) return TextInputPopAction.unfocus;
  if (hasEditableFocus) return TextInputPopAction.ignore;
  return TextInputPopAction.leave;
}

bool hasEditableTextFocus(FocusNode? focus) {
  return focus != null && focus.hasFocus && focus.context?.widget is EditableText;
}
