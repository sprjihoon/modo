export type CameraFacing = "environment" | "user";

/** 브라우저 Permissions-Policy가 이 문서에서 카메라를 허용하는지 */
export function isCameraAllowedByPolicy(): boolean | null {
  if (typeof document === "undefined") return null;
  const policy =
    (document as Document & {
      permissionsPolicy?: { allowsFeature?: (feature: string) => boolean };
      featurePolicy?: { allowsFeature?: (feature: string) => boolean };
    }).permissionsPolicy ||
    (document as Document & {
      featurePolicy?: { allowsFeature?: (feature: string) => boolean };
    }).featurePolicy;
  if (!policy?.allowsFeature) return null;
  try {
    return policy.allowsFeature("camera");
  } catch {
    return null;
  }
}

export function formatCameraError(err: unknown): string {
  const name =
    err && typeof err === "object" && "name" in err
      ? String((err as { name?: unknown }).name)
      : "";
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message)
      : "";

  const policyBlocked = isCameraAllowedByPolicy() === false;
  const permissionDenied =
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    /permission denied/i.test(message);

  if (policyBlocked || /permissions policy/i.test(message)) {
    return "이 페이지에서 카메라가 차단되어 있습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.";
  }

  if (permissionDenied) {
    return "카메라 권한이 거부되었습니다. 주소창 왼쪽 자물쇠(또는 카메라 아이콘)에서 카메라를 '허용'으로 바꾼 뒤 재시도하세요.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "카메라 장치를 찾을 수 없습니다. USB 카메라 연결을 확인해주세요.";
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return "카메라가 다른 프로그램에서 사용 중입니다. 카메라 앱, Zoom 등을 종료한 뒤 재시도하세요.";
  }

  if (name === "OverconstrainedError") {
    return "이 카메라 설정을 지원하지 않습니다. 재시도하면 기본 설정으로 다시 엽니다.";
  }

  if (message && /초과|timeout/i.test(message)) {
    return message;
  }

  return message || "카메라를 시작할 수 없습니다.";
}

export async function requestCameraStream(
  facing: CameraFacing = "environment"
): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("이 브라우저는 카메라를 지원하지 않습니다.");
  }

  const attempts: MediaStreamConstraints[] = [
    { video: true, audio: false },
    { video: { facingMode: { ideal: facing } }, audio: false },
    { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      lastError = e;
      const name =
        e && typeof e === "object" && "name" in e
          ? String((e as { name?: unknown }).name)
          : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        throw e;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("카메라 스트림을 가져올 수 없습니다.");
}
