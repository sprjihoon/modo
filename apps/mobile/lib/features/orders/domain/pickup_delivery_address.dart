class ResolvedPickupDelivery {
  final String pickupAddress;
  final String pickupAddressDetail;
  final String pickupZipcode;
  final String pickupPhone;
  final String deliveryAddress;
  final String deliveryAddressDetail;
  final String deliveryZipcode;
  final String deliveryPhone;
  final String customerName;
  final String customerPhone;

  const ResolvedPickupDelivery({
    required this.pickupAddress,
    required this.pickupAddressDetail,
    required this.pickupZipcode,
    required this.pickupPhone,
    required this.deliveryAddress,
    required this.deliveryAddressDetail,
    required this.deliveryZipcode,
    required this.deliveryPhone,
    required this.customerName,
    required this.customerPhone,
  });
}

/// 수거신청 체크박스: 같으면 수거지 복사, 다르면 배송지를 그대로 두고
/// 수거지 연락처는 덮지 않는다.
ResolvedPickupDelivery resolvePickupDelivery({
  required bool sameAsPickup,
  required String pickupAddress,
  required String pickupAddressDetail,
  required String pickupZipcode,
  required String pickupPhone,
  required String pickupName,
  required String deliveryAddress,
  required String deliveryAddressDetail,
  required String deliveryZipcode,
  required String deliveryPhone,
  required String deliveryName,
}) {
  if (sameAsPickup) {
    return ResolvedPickupDelivery(
      pickupAddress: pickupAddress,
      pickupAddressDetail: pickupAddressDetail,
      pickupZipcode: pickupZipcode,
      pickupPhone: pickupPhone,
      deliveryAddress: pickupAddress,
      deliveryAddressDetail: pickupAddressDetail,
      deliveryZipcode: pickupZipcode,
      deliveryPhone: pickupPhone,
      customerName: pickupName,
      customerPhone: pickupPhone,
    );
  }

  return ResolvedPickupDelivery(
    pickupAddress: pickupAddress,
    pickupAddressDetail: pickupAddressDetail,
    pickupZipcode: pickupZipcode,
    pickupPhone: pickupPhone,
    deliveryAddress: deliveryAddress,
    deliveryAddressDetail: deliveryAddressDetail,
    deliveryZipcode: deliveryZipcode,
    deliveryPhone: deliveryPhone,
    customerName: deliveryName.isNotEmpty ? deliveryName : pickupName,
    customerPhone: deliveryPhone.isNotEmpty ? deliveryPhone : pickupPhone,
  );
}
