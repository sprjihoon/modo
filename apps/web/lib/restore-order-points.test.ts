import {
  calcPartialRestorePoints,
} from "./restore-order-points";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(calcPartialRestorePoints(0, 40000, 20000) === 0, "no points used");
assert(calcPartialRestorePoints(5000, 40000, 0) === 0, "no cancel amount");
assert(calcPartialRestorePoints(-100, 40000, 20000) === 0, "negative points");
assert(
  calcPartialRestorePoints(5000, 40000, 20000) === 2222,
  "5000 * 20000 / 45000",
);
assert(
  calcPartialRestorePoints(5000, 40000, 45000) === 5000,
  "cancel at or above original caps at used",
);
assert(
  calcPartialRestorePoints(1000, 0, 500) === 500,
  "points-only order: 1000 * 500 / 1000",
);
assert(
  calcPartialRestorePoints(1000, 0, 0) === 0,
  "points-only with zero cancel stays 0",
);
assert(
  calcPartialRestorePoints(999, 1, 1) === 0,
  "tiny cancel floors to 0",
);
assert(
  calcPartialRestorePoints(3000.9 as unknown as number, 27000.4 as unknown as number, 9000.8 as unknown as number) === 900,
  "floors inputs: 3000 * 9000 / 30000",
);

// 같은 주문에 부분 취소를 두 번 해도 JS는 원주문 기준으로 계산한다.
// RPC가 이미 복구한 금액을 빼므로 두 번째 2222 + 잔여 556은 전액 취소 때 회수된다.
const first = calcPartialRestorePoints(5000, 40000, 20000);
const second = calcPartialRestorePoints(5000, 40000, 20000);
assert(first === 2222 && second === 2222, "same inputs yield same partial");
assert(first + second < 5000, "two equal partials leave remainder for full restore");

console.log("restore-order-points.test.ts ok");
