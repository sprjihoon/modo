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

const daily = new FakeEl(640, 640);
const compare = new FakeEl(1180, 1180);

const dailyDoc = {
  getElementById: () => daily,
  querySelector: () => daily,
} as unknown as Document;

const compareDoc = {
  getElementById: () => compare,
  querySelector: () => compare,
} as unknown as Document;

assert(measureGuideEmbedContentHeight(dailyDoc) === 640, "daily tab height");
assert(measureGuideEmbedContentHeight(compareDoc) === 1180, "compare tab height");
assert(
  measureGuideEmbedContentHeight(dailyDoc) <
    measureGuideEmbedContentHeight(compareDoc),
  "tabs report their own height"
);

console.log("measure-guide-embed-height.test.ts ok");
