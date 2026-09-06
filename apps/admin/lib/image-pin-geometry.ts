export type PinCoordSpace = "image" | "container";

export type Size = { width: number; height: number };
export type Rect = { left: number; top: number; width: number; height: number };

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** object-contain 으로 그려지는 실제 이미지 영역 */
export function containRect(container: Size, image: Size): Rect {
  const cw = container.width;
  const ch = container.height;
  const iw = image.width;
  const ih = image.height;
  if (cw <= 0 || ch <= 0 || iw <= 0 || ih <= 0) {
    return { left: 0, top: 0, width: Math.max(0, cw), height: Math.max(0, ch) };
  }
  const containerRatio = cw / ch;
  const imageRatio = iw / ih;
  if (imageRatio > containerRatio) {
    const height = cw / imageRatio;
    return { left: 0, top: (ch - height) / 2, width: cw, height };
  }
  const width = ch * imageRatio;
  return { left: (cw - width) / 2, top: 0, width, height: ch };
}

export function imageRelativeToContainerPercent(
  pin: { x: number; y: number },
  container: Size,
  contain: Rect,
): { leftPct: number; topPct: number } {
  if (container.width <= 0 || container.height <= 0) {
    return { leftPct: clamp01(pin.x) * 100, topPct: clamp01(pin.y) * 100 };
  }
  return {
    leftPct: ((contain.left + clamp01(pin.x) * contain.width) / container.width) * 100,
    topPct: ((contain.top + clamp01(pin.y) * contain.height) / container.height) * 100,
  };
}

export function pinToContainerPercent(
  pin: { x: number; y: number },
  coordSpace: PinCoordSpace | undefined,
  container: Size,
  contain: Rect,
): { leftPct: number; topPct: number } {
  if (coordSpace === "image") {
    return imageRelativeToContainerPercent(pin, container, contain);
  }
  return { leftPct: clamp01(pin.x) * 100, topPct: clamp01(pin.y) * 100 };
}
