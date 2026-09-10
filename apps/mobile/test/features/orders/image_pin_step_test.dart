import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/orders/domain/models/order_draft.dart';
import 'package:modu_repair/features/orders/presentation/widgets/image_pin_step.dart';

void main() {
  testWidgets('사진 없이 건너뛰기 completes with an empty list', (tester) async {
    List<ImageWithPins>? completed;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ImagePinStep(
            existingImages: const [],
            onComplete: (images) => completed = images,
          ),
        ),
      ),
    );

    expect(find.text('사진 없이 건너뛰기'), findsOneWidget);
    await tester.tap(find.text('사진 없이 건너뛰기'));
    await tester.pump();

    expect(completed, isNotNull);
    expect(completed, isEmpty);
  });

  testWidgets('existing photos can continue without pins', (tester) async {
    List<ImageWithPins>? completed;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ImagePinStep(
            existingImages: const [
              ImageWithPins(
                imageUrl: 'https://example.com/a.jpg',
                coordSpace: 'image',
              ),
              ImageWithPins(
                imageUrl: 'https://example.com/b.jpg',
                pins: [
                  PinData(id: 'p1', relativeX: 0.3, relativeY: 0.4, memo: '소매'),
                ],
                coordSpace: 'image',
              ),
            ],
            onComplete: (images) => completed = images,
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('사진 없이 건너뛰기'), findsNothing);
    expect(find.text('사진 2장 첨부 → 다음'), findsOneWidget);

    await tester.tap(find.text('사진 2장 첨부 → 다음'));
    await tester.pump();

    expect(completed, hasLength(2));
    expect(completed![1].pins.single.memo, '소매');
    expect(completed![0].coordSpace, 'image');
  });

  testWidgets('5장일 때 추가 버튼이 없다', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ImagePinStep(
            existingImages: List.generate(
              5,
              (i) => ImageWithPins(imageUrl: 'https://example.com/$i.jpg'),
            ),
            onComplete: (_) {},
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('5/5'), findsNothing);
    expect(find.text('사진 5장 첨부 → 다음'), findsOneWidget);
  });

  testWidgets('수선항목 칩을 보여주지 않는다', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ImagePinStep(
            existingImages: const [],
            onComplete: (_) {},
          ),
        ),
      ),
    );

    expect(find.text('청바지'), findsNothing);
    expect(find.text('수선할 부위를 사진으로 보여주세요'), findsOneWidget);
  });

  testWidgets('등록된 사진 썸네일은 다음 버튼 위에 있다', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ImagePinStep(
            existingImages: const [
              ImageWithPins(
                imageUrl: 'https://example.com/a.jpg',
                coordSpace: 'image',
              ),
            ],
            onComplete: (_) {},
          ),
        ),
      ),
    );
    await tester.pump();

    final addThumb = tester.getTopLeft(find.text('1/5'));
    final nextButton = tester.getTopLeft(find.text('사진 1장 첨부 → 다음'));
    expect(addThumb.dy, lessThan(nextButton.dy));
  });
}
