/** iOS는 앱스토어 출시됨. 환경변수가 없어도 홈/다운로드가 깨지지 않게 기본값을 둔다. */
export const IOS_APP_STORE_URL =
  process.env.NEXT_PUBLIC_IOS_APP_URL?.trim() ||
  "https://apps.apple.com/kr/app/모두의수선/id6759492888";

/** Play 프로덕션이 열리면 Vercel에 NEXT_PUBLIC_ANDROID_APP_URL 을 넣는다. */
export const ANDROID_PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_ANDROID_APP_URL?.trim() || "";

export const APP_DOWNLOAD_PATH = "/download";

export type DeviceStore = "ios" | "android" | "other";

export function detectDeviceStore(ua: string): DeviceStore {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

/** 배너 클릭 시 이동할 주소. 아이폰만 스토어로 직행, 나머지는 선택 페이지. */
export function getAppDownloadHref(ua: string): string {
  const device = detectDeviceStore(ua);
  if (device === "ios") return IOS_APP_STORE_URL;
  if (device === "android" && ANDROID_PLAY_STORE_URL) {
    return ANDROID_PLAY_STORE_URL;
  }
  return APP_DOWNLOAD_PATH;
}
