import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/services/image_service.dart';

void main() {
  test('order-images public URL에서 Storage 경로를 뽑는다', () {
    expect(
      orderImageStoragePath(
        'https://xx.supabase.co/storage/v1/object/public/order-images/repairs/a_1.jpg',
      ),
      'repairs/a_1.jpg',
    );
    expect(orderImageStoragePath('orders/web-file.jpg'), 'orders/web-file.jpg');
    expect(orderImageStoragePath('https://cdn.example/foo.jpg'), isNull);
    expect(orderImageStoragePath(''), isNull);
  });

  test('review-images public URL에서 Storage 경로를 뽑는다', () {
    expect(
      orderImageStoragePath(
        'https://xx.supabase.co/storage/v1/object/public/review-images/11111111-1111-1111-1111-111111111111/a.jpg',
        bucket: 'review-images',
      ),
      '11111111-1111-1111-1111-111111111111/a.jpg',
    );
    expect(
      orderImageStoragePath(
        'https://xx.supabase.co/storage/v1/object/public/order-images/repairs/a.jpg',
        bucket: 'review-images',
      ),
      isNull,
    );
  });
}
