/// 수선 수치: 숫자(0-9)만. +, -, ., e 등 부호·기호 조합은 불가.
String sanitizeMeasurementInput(String raw) =>
    raw.replaceAll(RegExp(r'\D'), '');
