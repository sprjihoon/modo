import { sanitizeMeasurementInput } from "./measurement-input";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(sanitizeMeasurementInput("30") === "30", "숫자만 유지");
assert(sanitizeMeasurementInput("12.5") === "125", "소수점은 제거");
assert(sanitizeMeasurementInput("-5") === "5", "마이너스 부호 제거");
assert(sanitizeMeasurementInput("+10") === "10", "플러스 부호 제거");
assert(sanitizeMeasurementInput("1e10") === "110", "e 표기 제거");
assert(sanitizeMeasurementInput("30cm") === "30", "단위 문자 제거");
assert(sanitizeMeasurementInput("허리: 28") === "28", "라벨·기호 제거");
assert(sanitizeMeasurementInput("") === "", "빈 문자열 유지");
assert(sanitizeMeasurementInput("  ") === "", "공백 제거");

console.log("measurement-input.test.ts ok");
