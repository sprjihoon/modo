import { resolvePickupDeliveryFields } from "./pickup-delivery-address";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const pickup = {
  pickupAddress: "대구 수성구 화랑로2길 62",
  pickupAddressDetail: "302",
  pickupZipcode: "42037",
};

const same = resolvePickupDeliveryFields({
  sameAsPickup: true,
  ...pickup,
  deliveryAddress: "",
  deliveryAddressDetail: "",
  deliveryZipcode: "",
});
assert(same.deliveryAddress === pickup.pickupAddress, "체크 시 배송지=수거지");
assert(same.deliveryAddressDetail === pickup.pickupAddressDetail, "체크 시 상세도 수거지");
assert(same.deliveryZipcode === pickup.pickupZipcode, "체크 시 우편번호도 수거지");

const different = resolvePickupDeliveryFields({
  sameAsPickup: false,
  ...pickup,
  deliveryAddress: "서울 강남구 테헤란로 1",
  deliveryAddressDetail: "101호",
  deliveryZipcode: "06236",
});
assert(different.pickupAddress === pickup.pickupAddress, "수거지는 그대로");
assert(different.deliveryAddress === "서울 강남구 테헤란로 1", "체크 해제 시 다른 배송지 유지");
assert(different.deliveryAddress !== different.pickupAddress, "수거지와 배송지가 다름");
assert(different.deliveryZipcode === "06236", "배송 우편번호 유지");

console.log("pickup-delivery-address.test.ts passed");
