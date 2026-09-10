import {
  calcPartialRestorePoints,
} from "./restore-order-points";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(calcPartialRestorePoints(0, 40000, 20000) === 0, "no points used");
assert(calcPartialRestorePoints(5000, 40000, 0) === 0, "no cancel amount");
assert(
  calcPartialRestorePoints(5000, 40000, 20000) === 2222,
  "5000 * 20000 / 45000",
);
assert(
  calcPartialRestorePoints(5000, 40000, 45000) === 5000,
  "cancel at or above original caps at used",
);
assert(
  calcPartialRestorePoints(1000, 0, 0) === 0,
  "points-only with zero cancel stays 0",
);

console.log("restore-order-points.test.ts ok");
