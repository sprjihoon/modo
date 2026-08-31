export type OutboundLabelAddressFields = {
  pickupAddress?: string | null;
  pickupAddressDetail?: string | null;
  pickupZipcode?: string | null;
  deliveryAddress?: string | null;
  deliveryAddressDetail?: string | null;
  deliveryZipcode?: string | null;
};

export type OutboundLabelRecipient = {
  address: string;
  zipcode: string;
  source: "delivery" | "pickup" | "empty";
};

function cleanPart(value?: string | null): string {
  const text = String(value ?? "").trim();
  if (!text || text === "주소 없음") return "";
  return text;
}

export function joinLabelAddress(address?: string | null, detail?: string | null): string {
  return [cleanPart(address), cleanPart(detail)].filter(Boolean).join(" ");
}

/**
 * 출고송장 받는분: 고객이 지정한 배송지(orders.delivery_*).
 * 수거신청에서 수거지와 배송지가 다르면 반드시 배송지를 쓴다.
 * 배송지가 비어 있을 때만 수거지로 떨어진다 (동일 주소 체크 / 레거시).
 * 수거예약 후 shipments.delivery_* 는 센터 주소이므로 쓰면 안 된다.
 */
export function resolveOutboundLabelRecipient(
  order: OutboundLabelAddressFields
): OutboundLabelRecipient {
  const delivery = joinLabelAddress(order.deliveryAddress, order.deliveryAddressDetail);
  const pickup = joinLabelAddress(order.pickupAddress, order.pickupAddressDetail);
  const deliveryZip = cleanPart(order.deliveryZipcode);
  const pickupZip = cleanPart(order.pickupZipcode);

  if (delivery) {
    return {
      address: delivery,
      zipcode: deliveryZip || pickupZip,
      source: "delivery",
    };
  }
  if (pickup) {
    return {
      address: pickup,
      zipcode: pickupZip,
      source: "pickup",
    };
  }
  return { address: "", zipcode: "", source: "empty" };
}
