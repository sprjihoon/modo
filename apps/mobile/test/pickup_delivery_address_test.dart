import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/features/orders/domain/pickup_delivery_address.dart';

void main() {
  group('resolvePickupDelivery', () {
    test('체크 시 배송지=수거지', () {
      final resolved = resolvePickupDelivery(
        sameAsPickup: true,
        pickupAddress: '대구 수성구 화랑로2길 62',
        pickupAddressDetail: '302',
        pickupZipcode: '42037',
        pickupPhone: '01027239490',
        pickupName: '홍길동',
        deliveryAddress: '',
        deliveryAddressDetail: '',
        deliveryZipcode: '',
        deliveryPhone: '',
        deliveryName: '',
      );

      expect(resolved.deliveryAddress, '대구 수성구 화랑로2길 62');
      expect(resolved.deliveryAddressDetail, '302');
      expect(resolved.deliveryZipcode, '42037');
      expect(resolved.deliveryPhone, '01027239490');
      expect(resolved.customerName, '홍길동');
    });

    test('체크 해제 시 다른 배송지를 유지하고 수거지 연락처는 유지', () {
      final resolved = resolvePickupDelivery(
        sameAsPickup: false,
        pickupAddress: '대구 수성구 화랑로2길 62',
        pickupAddressDetail: '302',
        pickupZipcode: '42037',
        pickupPhone: '01027239490',
        pickupName: '홍길동',
        deliveryAddress: '서울 강남구 테헤란로 1',
        deliveryAddressDetail: '101호',
        deliveryZipcode: '06236',
        deliveryPhone: '01011112222',
        deliveryName: '김수령',
      );

      expect(resolved.pickupAddress, '대구 수성구 화랑로2길 62');
      expect(resolved.pickupPhone, '01027239490');
      expect(resolved.deliveryAddress, '서울 강남구 테헤란로 1');
      expect(resolved.deliveryAddress, isNot(resolved.pickupAddress));
      expect(resolved.deliveryPhone, '01011112222');
      expect(resolved.customerName, '김수령');
      expect(resolved.customerPhone, '01011112222');
    });
  });
}
