import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/core/navigation/text_input_pop.dart';

void main() {
  group('textInputPopAction', () {
    test('키보드가 열려 있으면 먼저 닫는다', () {
      expect(
        textInputPopAction(viewInsetsBottom: 300, hasEditableFocus: true),
        TextInputPopAction.unfocus,
      );
    });

    test('입력창만 포커스된 IME 부착 직후는 페이지를 닫지 않는다', () {
      expect(
        textInputPopAction(viewInsetsBottom: 0, hasEditableFocus: true),
        TextInputPopAction.ignore,
      );
    });

    test('입력과 무관한 뒤로가기는 페이지 이탈로 처리한다', () {
      expect(
        textInputPopAction(viewInsetsBottom: 0, hasEditableFocus: false),
        TextInputPopAction.leave,
      );
    });
  });
}
