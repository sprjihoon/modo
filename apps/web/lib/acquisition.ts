export const ACQ_COOKIE = "modo_acq";
export const ACQ_STORAGE_KEY = "modo_acq";
const COOKIE_DAYS = 90;

export type AcquisitionTouch = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  referrer: string;
};

export type AcquisitionPair = {
  first: AcquisitionTouch;
  last: AcquisitionTouch;
};

export function emptyTouch(): AcquisitionTouch {
  return { source: "", medium: "", campaign: "", content: "", term: "", referrer: "" };
}

export function hasSource(touch?: AcquisitionTouch | null): boolean {
  return Boolean(touch?.source?.trim());
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function touchFromSearchParams(params: URLSearchParams, referrer = ""): AcquisitionTouch {
  return {
    source: params.get("utm_source") || params.get("source") || "",
    medium: params.get("utm_medium") || "",
    campaign: params.get("utm_campaign") || "",
    content: params.get("utm_content") || "",
    term: params.get("utm_term") || "",
    referrer,
  };
}

export function mergeAcquisition(stored: AcquisitionPair | null | undefined, incoming: AcquisitionTouch): AcquisitionPair {
  const prev = stored || { first: emptyTouch(), last: emptyTouch() };
  const nextIncoming = hasSource(incoming) ? incoming : emptyTouch();
  const first = hasSource(prev.first) ? prev.first : nextIncoming.source ? { ...nextIncoming, referrer: nextIncoming.referrer || incoming.referrer } : {
    ...prev.first,
    referrer: prev.first.referrer || incoming.referrer,
  };
  const last = nextIncoming.source
    ? { ...nextIncoming, referrer: nextIncoming.referrer || incoming.referrer }
    : {
        ...(hasSource(prev.last) ? prev.last : first),
        referrer: prev.last.referrer || first.referrer || incoming.referrer,
      };
  return { first, last };
}

export function parseAcquisitionJson(raw?: string | null): AcquisitionPair | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AcquisitionPair> & Partial<AcquisitionTouch>;
    if (parsed.first || parsed.last) {
      return {
        first: { ...emptyTouch(), ...(parsed.first || {}) },
        last: { ...emptyTouch(), ...(parsed.last || {}) },
      };
    }
    if (parsed.source) {
      const touch = {
        source: text(parsed.source),
        medium: text(parsed.medium),
        campaign: text(parsed.campaign),
        content: text(parsed.content),
        term: text(parsed.term),
        referrer: text(parsed.referrer),
      };
      return { first: touch, last: touch };
    }
  } catch {
    return null;
  }
  return null;
}

export function parseCookieHeader(cookieHeader?: string | null): AcquisitionPair | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACQ_COOKIE}=`));
  if (!match) return null;
  try {
    return parseAcquisitionJson(decodeURIComponent(match.slice(ACQ_COOKIE.length + 1)));
  } catch {
    return null;
  }
}

export function cookieWriteValue(pair: AcquisitionPair): string {
  return encodeURIComponent(JSON.stringify(pair));
}

export function acqColumns(touch?: AcquisitionTouch | null): {
  acq_source: string | null;
  acq_medium: string | null;
  acq_campaign: string | null;
  acq_content: string | null;
  acq_term: string | null;
} | null {
  const source = touch?.source.trim() || "";
  if (!source || !touch) return null;
  return {
    acq_source: source,
    acq_medium: touch.medium.trim() || null,
    acq_campaign: touch.campaign.trim() || null,
    acq_content: touch.content.trim() || null,
    acq_term: touch.term.trim() || null,
  };
}

export function captureBrowserAcquisition(): AcquisitionPair {
  if (typeof window === "undefined") {
    return { first: emptyTouch(), last: emptyTouch() };
  }
  const url = new URL(window.location.href);
  const incoming = touchFromSearchParams(url.searchParams, document.referrer || "");
  let stored = parseAcquisitionJson(sessionStorage.getItem(ACQ_STORAGE_KEY));
  if (!stored) {
    stored = parseCookieHeader(document.cookie);
  }
  const next = mergeAcquisition(stored, incoming);
  try {
    sessionStorage.setItem(ACQ_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  try {
    document.cookie = `${ACQ_COOKIE}=${cookieWriteValue(next)}; Path=/; Max-Age=${COOKIE_DAYS * 86400}; SameSite=Lax`;
  } catch {
    // ignore
  }
  return next;
}
