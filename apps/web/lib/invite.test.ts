import { OG_IMAGE, OG_IMAGE_PATH, pageMetadata } from "./seo";
import {
  isSignupCompletePath,
  loginHrefWithInvite,
  normalizeInviteCode,
  SIGNUP_COMPLETE_PATH,
  signupHrefWithInvite,
} from "./invite";
import { safeRedirectPath } from "./utils";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(normalizeInviteCode(" modo12ab ") === "MODO12AB", "normalize invite");
assert(signupHrefWithInvite("MODO12AB") === "/signup?invite=MODO12AB", "signup keeps invite");
assert(loginHrefWithInvite("modo12ab") === "/login?invite=MODO12AB", "login keeps invite");
assert(signupHrefWithInvite("") === "/signup", "signup without invite");
assert(loginHrefWithInvite(null) === "/login", "login without invite");
assert(SIGNUP_COMPLETE_PATH === "/download?joined=1", "signup complete path");
assert(isSignupCompletePath("/download?joined=1"), "joined download is complete");
assert(!isSignupCompletePath("/download"), "plain download is not complete");
assert(!isSignupCompletePath("/signup"), "signup is not complete");
assert(
  safeRedirectPath("/download?joined=1") === "/download?joined=1",
  "joined redirect allowed"
);

const signupMeta = pageMetadata({
  title: "친구 초대 가입",
  description: "초대 코드로 가입하면 포인트가 적립됩니다.",
  path: "/signup",
});
const ogImages = signupMeta.openGraph?.images;
assert(OG_IMAGE_PATH === "/og.jpg", "og image path");
assert(OG_IMAGE.url === "https://modo.io.kr/og.jpg", "og image absolute url");
assert(OG_IMAGE.width === 1200 && OG_IMAGE.height === 600, "og image size");
assert(OG_IMAGE.type === "image/jpeg", "og image type");
assert(
  Array.isArray(ogImages) && ogImages[0] && typeof ogImages[0] === "object" && "url" in ogImages[0] && ogImages[0].url === "https://modo.io.kr/og.jpg",
  "signup metadata includes og image"
);

console.log("invite.test.ts ok");
