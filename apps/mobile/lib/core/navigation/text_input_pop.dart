import 'package:flutter/material.dart';

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
  bool keyboardClosedRecently = false,
}) {
  if (viewInsetsBottom > 0) return TextInputPopAction.unfocus;
  if (hasEditableFocus) return TextInputPopAction.ignore;
  // 안드로이드는 키패드를 먼저 내린 뒤 pop을 보내 insets가 0인 채로 온다.
  if (keyboardClosedRecently) return TextInputPopAction.ignore;
  return TextInputPopAction.leave;
}

bool hasEditableTextFocus(FocusNode? focus) {
  if (focus == null || !focus.hasFocus) return false;
  final widget = focus.context?.widget;
  if (widget is EditableText) return true;
  var found = false;
  focus.context?.visitAncestorElements((el) {
    if (el.widget is EditableText) {
      found = true;
      return false;
    }
    return true;
  });
  return found;
}

/// 키보드가 방금 닫혔는지 기억한다. 시스템 뒤로가기가 키패드 닫힘과
/// 페이지 이탈을 한 번에 처리하는 것을 막는다.
class KeyboardPopGuard {
  bool _wasOpen = false;
  DateTime? _closedAt;

  static const _grace = Duration(milliseconds: 600);

  void update(double viewInsetsBottom) {
    final open = viewInsetsBottom > 0;
    if (_wasOpen && !open) {
      _closedAt = DateTime.now();
    }
    _wasOpen = open;
  }

  bool get justClosed {
    final at = _closedAt;
    if (at == null) return false;
    return DateTime.now().difference(at) < _grace;
  }
}

/// Scaffold가 viewInsets를 소비해도 실제 키보드 높이를 본다.
double rawKeyboardInset(BuildContext context) {
  return MediaQueryData.fromView(View.of(context)).viewInsets.bottom;
}

/// 키패드가 열려 있거나 입력창에 포커스가 있으면 닫고 true.
bool dismissKeyboardIfOpen(BuildContext context) {
  final open = rawKeyboardInset(context) > 0;
  final focus = FocusManager.instance.primaryFocus;
  final editing = hasEditableTextFocus(focus);
  if (!open && !editing) return false;
  focus?.unfocus();
  return true;
}

/// 숫자 키패드처럼 닫기 키가 없을 때 바로 위에 두는 완료 바.
class KeyboardDoneBar extends StatelessWidget {
  const KeyboardDoneBar({super.key});

  @override
  Widget build(BuildContext context) {
    if (rawKeyboardInset(context) <= 0) {
      return const SizedBox.shrink();
    }
    return Material(
      color: const Color(0xFFF3F4F6),
      child: SizedBox(
        height: 44,
        width: double.infinity,
        child: Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => FocusManager.instance.primaryFocus?.unfocus(),
            child: const Text(
              '완료',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF00C896),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
