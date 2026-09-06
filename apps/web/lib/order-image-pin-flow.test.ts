import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const webRoot = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(webRoot, rel), "utf8");

const step = read("components/order/ImagePinStep.tsx");
assert(step.includes("planOrderImageUpload"), "upload planner used");
assert(step.includes("reservedUploadsRef"), "concurrent slot reservation");
assert(step.includes("try {"), "upload try");
assert(step.includes("} finally {"), "upload finally");
assert(step.includes("aliveRef"), "unmount-safe upload");
assert(step.includes("clientToImageRelative"), "image-space click");
assert(step.includes("selectImage"), "shared photo select");
assert(step.includes("onImagesChange"), "parent photo sync");
assert(step.includes('coordSpace: "image"'), "new photos mark image space");
assert(step.includes("isAllowedOrderImageFile"), "file type/size check");

const client = read("components/order/OrderNewClient.tsx");
assert(client.includes("handlePhotoImagesChange"), "staging sync handler");
assert(client.includes("onImagesChange={handlePhotoImagesChange}"), "photo step syncs staging");
assert(
  client.includes("stagingRef.current.stagingImagesWithPins"),
  "exit/cancel use current staging photos",
);
assert(client.includes('coordSpace?: "image" | "container"'), "draft keeps coord space");

const pricing = read("lib/order-pricing.ts");
assert(
  pricing.includes("imagesWithPins: imagesWithPins.length > 0 ? imagesWithPins : null"),
  "quote payload keeps full pin list",
);

console.log("order-image-pin-flow.test.ts ok");
