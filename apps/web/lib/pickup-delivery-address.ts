export type PickupDeliveryInput = {
  sameAsPickup: boolean;
  pickupAddress: string;
  pickupAddressDetail: string;
  pickupZipcode: string;
  deliveryAddress: string;
  deliveryAddressDetail: string;
  deliveryZipcode: string;
};

export type PickupDeliveryFields = {
  pickupAddress: string;
  pickupAddressDetail: string;
  pickupZipcode: string;
  deliveryAddress: string;
  deliveryAddressDetail: string;
  deliveryZipcode: string;
};

/** 수거신청 체크박스: 같으면 수거지 복사, 다르면 배송지를 그대로 저장 */
export function resolvePickupDeliveryFields(input: PickupDeliveryInput): PickupDeliveryFields {
  const pickupAddress = input.pickupAddress.trim();
  const pickupAddressDetail = input.pickupAddressDetail.trim();
  const pickupZipcode = input.pickupZipcode.trim();

  if (input.sameAsPickup) {
    return {
      pickupAddress,
      pickupAddressDetail,
      pickupZipcode,
      deliveryAddress: pickupAddress,
      deliveryAddressDetail: pickupAddressDetail,
      deliveryZipcode: pickupZipcode,
    };
  }

  return {
    pickupAddress,
    pickupAddressDetail,
    pickupZipcode,
    deliveryAddress: input.deliveryAddress.trim(),
    deliveryAddressDetail: input.deliveryAddressDetail.trim(),
    deliveryZipcode: input.deliveryZipcode.trim(),
  };
}
