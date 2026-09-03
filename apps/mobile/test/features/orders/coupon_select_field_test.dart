import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/orders/presentation/widgets/coupon_select_field.dart';

void main() {
  const coupons = [
    {
      'code': 'WELCOME',
      'discount_type': 'FIXED',
      'discount_value': 5000,
      'description': '신규 환영',
    },
    {
      'code': 'SALE10',
      'discount_type': 'PERCENTAGE',
      'discount_value': 10,
    },
  ];

  testWidgets('비어 있으면 쿠폰 없음을 보여준다', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: CouponSelectField(coupons: []),
        ),
      ),
    );

    expect(find.text('사용 가능한 쿠폰이 없습니다'), findsOneWidget);
  });

  testWidgets('선택이 없으면 안내 문구를 보여준다', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: CouponSelectField(coupons: coupons),
        ),
      ),
    );

    expect(find.text('쿠폰을 선택하세요'), findsOneWidget);
  });

  testWidgets('선택된 쿠폰은 코드와 할인액을 보여준다', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: CouponSelectField(
            coupons: coupons,
            selectedCode: 'WELCOME',
          ),
        ),
      ),
    );

    expect(find.text('WELCOME · 5,000원 할인'), findsOneWidget);
  });

  testWidgets('셀렉트를 누르면 목록에서 고를 수 있다', (tester) async {
    String? picked;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CouponSelectField(
            coupons: coupons,
            onTap: () async {
              picked = 'SALE10';
            },
          ),
        ),
      ),
    );

    await tester.tap(find.text('쿠폰을 선택하세요'));
    await tester.pump();
    expect(picked, 'SALE10');
  });

  testWidgets('시트에서 쿠폰을 고르면 코드가 돌아온다', (tester) async {
    String? picked;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () async {
                picked = await showCouponSelectSheet(
                  context: context,
                  coupons: coupons,
                );
              },
              child: const Text('열기'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();
    expect(find.text('쿠폰 선택'), findsOneWidget);
    expect(find.text('WELCOME · 5,000원 할인'), findsOneWidget);

    await tester.tap(find.text('SALE10 · 10% 할인'));
    await tester.pumpAndSettle();
    expect(picked, 'SALE10');
  });
}
