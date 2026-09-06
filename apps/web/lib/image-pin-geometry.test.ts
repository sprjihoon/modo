import {
  clamp01,
  clientToImageRelative,
  clientToImageRelativeClamped,
  containRect,
  containerRelativeToImageRelative,
  imageRelativeToContainerPercent,
  pinToContainerPercent,
} from "./image-pin-geometry";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(clamp01(-0.2) === 0, "clamp low");
assert(clamp01(1.4) === 1, "clamp high");
assert(clamp01(0.3) === 0.3, "clamp mid");
assert(clamp01(Number.NaN) === 0, "clamp nan");

const landscape = containRect({ width: 400, height: 300 }, { width: 800, height: 400 });
assert(landscape.width === 400, "wide image fills width");
assert(Math.abs(landscape.height - 200) < 0.001, "wide image letterbox height");
assert(landscape.left === 0, "wide image no side pad");
assert(Math.abs(landscape.top - 50) < 0.001, "wide image vertical pad");

const portrait = containRect({ width: 400, height: 300 }, { width: 400, height: 800 });
assert(portrait.height === 300, "tall image fills height");
assert(Math.abs(portrait.width - 150) < 0.001, "tall image letterbox width");
assert(Math.abs(portrait.left - 125) < 0.001, "tall image side pad");
assert(portrait.top === 0, "tall image no vertical pad");

const origin = { left: 10, top: 20 };
const inImage = clientToImageRelative(10 + 125 + 75, 20 + 150, origin, portrait);
assert(inImage !== null && Math.abs(inImage.x - 0.5) < 0.001, "click image center x");
assert(inImage !== null && Math.abs(inImage.y - 0.5) < 0.001, "click image center y");

const inLetterbox = clientToImageRelative(15, 20 + 150, origin, portrait);
assert(inLetterbox === null, "letterbox click ignored");

const clamped = clientToImageRelativeClamped(15, 20 + 150, origin, portrait);
assert(clamped !== null && clamped.x === 0, "drag clamps to image edge");

const pct = imageRelativeToContainerPercent(
  { x: 0.5, y: 0.5 },
  { width: 400, height: 300 },
  portrait,
);
assert(Math.abs(pct.leftPct - 50) < 0.001, "image center maps to container center x");
assert(Math.abs(pct.topPct - 50) < 0.001, "image center maps to container center y");

const converted = containerRelativeToImageRelative(
  { x: 0.5, y: 0.5 },
  { width: 400, height: 300 },
  portrait,
);
assert(Math.abs(converted.x - 0.5) < 0.001, "legacy center stays center");
assert(Math.abs(converted.y - 0.5) < 0.001, "legacy center y");

const imageSpace = pinToContainerPercent(
  { x: 0, y: 0 },
  "image",
  { width: 400, height: 300 },
  portrait,
);
assert(Math.abs(imageSpace.leftPct - (125 / 400) * 100) < 0.001, "image-space pin sits on photo");

const legacy = pinToContainerPercent(
  { x: 0.1, y: 0.2 },
  "container",
  { width: 400, height: 300 },
  portrait,
);
assert(Math.abs(legacy.leftPct - 10) < 0.001, "legacy pin stays container percent");
assert(Math.abs(legacy.topPct - 20) < 0.001, "legacy pin y");

console.log("image-pin-geometry.test.ts ok");
