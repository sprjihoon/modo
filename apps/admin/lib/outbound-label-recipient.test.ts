import { joinLabelAddress, resolveOutboundLabelRecipient } from "./outbound-label-recipient";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const pickup = {
  pickupAddress: "서울 강남구 테헤란로 1",
  pickupAddressDetail: "101호",
  pickupZipcode: "06236",
};
const delivery = {
  deliveryAddress: "부산 해운대구 센텀로 10",
  deliveryAddressDetail: "202호",
  deliveryZipcode: "48058",
};

const different = resolveOutboundLabelRecipient({ ...pickup, ...delivery });
assert(different.source === "delivery", "수거지≠배송지면 배송지 사용");
assert(different.address === "부산 해운대구 센텀로 10 202호", "출고송장 받는분은 배송지+상세");
assert(different.zipcode === "48058", "출고송장 우편번호는 배송지");
assert(different.address !== joinLabelAddress(pickup.pickupAddress, pickup.pickupAddressDetail), "수거주소와 다르게 출력");

const sameAddress = "서울 마포구 월드컵로 1";
const same = resolveOutboundLabelRecipient({
  pickupAddress: sameAddress,
  pickupAddressDetail: "3층",
  pickupZipcode: "03949",
  deliveryAddress: sameAddress,
  deliveryAddressDetail: "3층",
  deliveryZipcode: "03949",
});
assert(same.source === "delivery", "동일 주소여도 배송지 컬럼을 우선");
assert(same.address === "서울 마포구 월드컵로 1 3층", "동일 주소는 그 주소를 출력");

const missingDelivery = resolveOutboundLabelRecipient(pickup);
assert(missingDelivery.source === "pickup", "배송지 없으면 수거지 fallback");
assert(missingDelivery.address === "서울 강남구 테헤란로 1 101호", "레거시 주문은 수거지");
assert(missingDelivery.zipcode === "06236", "레거시 우편번호는 수거지");

const looksLikeCenter = resolveOutboundLabelRecipient({
  ...pickup,
  deliveryAddress: "대구 동구 동대구로 550",
  deliveryAddressDetail: "오피스텔 1201호",
  deliveryZipcode: "41142",
});
assert(
  looksLikeCenter.address === "대구 동구 동대구로 550 오피스텔 1201호",
  "배송지가 센터 근처처럼 보여도 고객이 적은 배송지를 유지"
);
assert(looksLikeCenter.source === "delivery", "센터 패턴 때문에 수거지로 되돌리면 안 됨");

const placeholder = resolveOutboundLabelRecipient({
  ...pickup,
  deliveryAddress: "주소 없음",
  deliveryAddressDetail: "",
  deliveryZipcode: "",
});
assert(placeholder.source === "pickup", "표시용 '주소 없음'은 빈 배송지로 취급");

const empty = resolveOutboundLabelRecipient({});
assert(empty.source === "empty" && empty.address === "", "둘 다 없으면 빈 값");

console.log("outbound-label-recipient.test.ts passed");
