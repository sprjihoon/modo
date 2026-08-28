import { formatPointDescription } from "./point-description";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(
  formatPointDescription(
    "결제 포인트 사용 예약 (intent:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee)",
    false,
  ) === "포인트 사용",
  "intent uuid hidden for use",
);

assert(
  formatPointDescription(
    "결제 포인트 예약 해제 (intent:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee)",
    true,
  ) === "포인트 사용 취소",
  "restore label",
);

assert(
  formatPointDescription(
    "결제 포인트 사용 예약 intent:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    false,
  ) === "포인트 사용",
  "bare intent uuid without parens",
);

assert(
  formatPointDescription("", true) === "포인트 적립",
  "empty earn fallback",
);

assert(
  formatPointDescription(null, false) === "포인트 사용",
  "null spend fallback",
);

assert(
  formatPointDescription("주문 적립", true) === "주문 적립",
  "regular earn text kept",
);

assert(
  formatPointDescription("친구 초대 적립", true) === "친구 초대 적립",
  "invite earn text kept",
);

console.log("point-description.test.ts ok");
