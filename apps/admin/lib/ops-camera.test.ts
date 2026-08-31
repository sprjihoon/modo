import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatCameraError, resolveOpsLiveVideoUpload } from "./ops-camera";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(
  formatCameraError({ name: "NotAllowedError", message: "Permission denied" }).includes(
    "자물쇠"
  ),
  "권한 거부 안내"
);
assert(
  formatCameraError({
    name: "NotAllowedError",
    message: "Permissions policy violation: camera is not allowed",
  }).includes("차단"),
  "Permissions-Policy 차단 안내"
);
assert(
  formatCameraError({ name: "NotFoundError", message: "Requested device not found" }).includes(
    "찾을 수 없습니다"
  ),
  "장치 없음"
);
assert(
  formatCameraError({ name: "NotReadableError", message: "Could not start video source" }).includes(
    "다른 프로그램"
  ),
  "점유 중"
);
assert(
  formatCameraError({ name: "OverconstrainedError", message: "overconstrained" }).includes("기본 설정"),
  "제약 실패"
);

const nextConfig = readFileSync(join(__dirname, "..", "next.config.js"), "utf8");
assert(
  nextConfig.includes("camera=(self)"),
  "ops Permissions-Policy는 camera=(self) 문법이어야 함"
);
assert(
  !/value:\s*'[^']*camera=self[,)]/.test(nextConfig),
  "괄호 없는 camera=self 는 Chrome이 차단함"
);
const sharedHeadersBlock = nextConfig.slice(
  nextConfig.indexOf("const securityHeaders"),
  nextConfig.indexOf("/** @type")
);
assert(
  !sharedHeadersBlock.includes("Permissions-Policy"),
  "전역 securityHeaders에 Permissions-Policy를 넣으면 ops 헤더와 교집합되어 카메라가 막힘"
);

const inboundUpload = resolveOpsLiveVideoUpload("/ops/inbound");
assert(inboundUpload.endpoint === "/api/ops/inbound/stream-upload", "입고 업로드 경로");
assert(inboundUpload.sequence === 1 && inboundUpload.videoType === "inbound_video", "입고영상 타입");

const outboundUpload = resolveOpsLiveVideoUpload("/ops/outbound");
assert(outboundUpload.endpoint === "/api/ops/outbound/stream-upload", "출고 업로드 경로");
assert(outboundUpload.sequence === 1 && outboundUpload.videoType === "outbound_video", "출고영상 타입");

console.log("ops-camera.test.ts passed");
