export const MEASURE_GUIDE_EMBED_ROOT_ID = "measure-guide-embed";
export const MEASURE_GUIDE_LAYOUT_EVENT = "measure-guide-layout";

/**
 * WebView 뷰포트가 아니라 가이드 본문 높이를 잰다.
 * document.scrollHeight 를 쓰면 긴 탭 높이가 WebView에 고정된 뒤
 * 짧은 탭으로 바꿔도 줄어들지 않는다.
 */
export function measureGuideEmbedContentHeight(doc: Document): number {
  const root =
    doc.getElementById(MEASURE_GUIDE_EMBED_ROOT_ID) ??
    doc.querySelector<HTMLElement>("[data-measure-guide-root]") ??
    doc.querySelector<HTMLElement>(".pb-10");

  if (root) {
    return Math.ceil(
      Math.max(root.scrollHeight, root.getBoundingClientRect().height)
    );
  }

  const body = doc.body;
  if (!body) return 0;
  let maxBottom = 0;
  for (const child of Array.from(body.children)) {
    if (!(child instanceof HTMLElement)) continue;
    maxBottom = Math.max(maxBottom, child.getBoundingClientRect().bottom);
  }
  return Math.ceil(maxBottom + (doc.defaultView?.scrollY ?? 0));
}
