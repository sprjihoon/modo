import { measureGuideEmbedContentHeight } from "./measure-guide-embed-height";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

class FakeEl {
  scrollHeight: number;
  private height: number;
  constructor(scrollHeight: number, height: number) {
    this.scrollHeight = scrollHeight;
    this.height = height;
  }
  getBoundingClientRect() {
    return { height: this.height, bottom: this.height };
  }
}

const shortGuide = new FakeEl(640, 640);
const tallGuide = new FakeEl(1180, 1180);

const shortDoc = {
  getElementById: () => shortGuide,
  querySelector: () => shortGuide,
} as unknown as Document;

const tallDoc = {
  getElementById: () => tallGuide,
  querySelector: () => tallGuide,
} as unknown as Document;

assert(measureGuideEmbedContentHeight(shortDoc) === 640, "short guide height");
assert(measureGuideEmbedContentHeight(tallDoc) === 1180, "tall guide height");
assert(
  measureGuideEmbedContentHeight(shortDoc) <
    measureGuideEmbedContentHeight(tallDoc),
  "guides report their own height"
);

console.log("measure-guide-embed-height.test.ts ok");
