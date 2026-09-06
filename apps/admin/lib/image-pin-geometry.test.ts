import { containRect, pinToContainerPercent } from "./image-pin-geometry";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const portrait = containRect({ width: 400, height: 300 }, { width: 400, height: 800 });
assert(Math.abs(portrait.left - 125) < 0.001, "side pad");
const imageSpace = pinToContainerPercent(
  { x: 0, y: 0 },
  "image",
  { width: 400, height: 300 },
  portrait,
);
assert(Math.abs(imageSpace.leftPct - (125 / 400) * 100) < 0.001, "image pin on photo");
const legacy = pinToContainerPercent({ x: 0.1, y: 0.2 }, undefined, { width: 400, height: 300 }, portrait);
assert(Math.abs(legacy.leftPct - 10) < 0.001, "legacy container percent");

console.log("image-pin-geometry.test.ts ok");
