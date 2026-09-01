import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/orders/domain/measurement_input.dart';

void main() {
  group('sanitizeMeasurementInput', () {
    test('keeps digits only', () {
      expect(sanitizeMeasurementInput('30'), '30');
    });

    test('strips decimal point', () {
      expect(sanitizeMeasurementInput('12.5'), '125');
    });

    test('strips plus and minus signs', () {
      expect(sanitizeMeasurementInput('-5'), '5');
      expect(sanitizeMeasurementInput('+10'), '10');
    });

    test('strips scientific notation and units', () {
      expect(sanitizeMeasurementInput('1e10'), '110');
      expect(sanitizeMeasurementInput('30cm'), '30');
      expect(sanitizeMeasurementInput('허리: 28'), '28');
    });

    test('empty and whitespace become empty', () {
      expect(sanitizeMeasurementInput(''), '');
      expect(sanitizeMeasurementInput('  '), '');
    });
  });
}
