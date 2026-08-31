import {
  ANDROID_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
  APP_DOWNLOAD_PATH,
  detectDeviceStore,
  getAppDownloadHref,
} from "./app-stores";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(IOS_APP_STORE_URL.includes("apps.apple.com"), "ios store url");
assert(
  ANDROID_PLAY_STORE_URL ===
    "https://play.google.com/store/apps/details?id=com.modurepair.app",
  "play store url"
);
assert(detectDeviceStore("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)") === "ios", "iphone");
assert(detectDeviceStore("Mozilla/5.0 (Linux; Android 14)") === "android", "android");
assert(detectDeviceStore("Mozilla/5.0 (Macintosh)") === "other", "desktop");
assert(
  getAppDownloadHref("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)") === IOS_APP_STORE_URL,
  "iphone goes to app store"
);
assert(
  getAppDownloadHref("Mozilla/5.0 (Linux; Android 14)") === ANDROID_PLAY_STORE_URL,
  "android goes to play"
);
assert(getAppDownloadHref("Mozilla/5.0 (Macintosh)") === APP_DOWNLOAD_PATH, "desktop stays on download");

console.log("app-stores.test.ts ok");
