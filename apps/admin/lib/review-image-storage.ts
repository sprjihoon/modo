export const REVIEW_IMAGE_BUCKET = "review-images";

type ReviewStorage = {
  from: (bucket: string) => {
    remove: (paths: string[]) => PromiseLike<{ error: { message: string } | null }>;
  };
};

/** public/sign URL 또는 `{userId}/file.jpg`에서 review-images 경로만 뽑는다. */
export function reviewImagePathFromUrl(url: string): string | null {
  const raw = (url || "").trim();
  if (!raw) return null;

  const markers = [
    `/object/public/${REVIEW_IMAGE_BUCKET}/`,
    `/object/sign/${REVIEW_IMAGE_BUCKET}/`,
    `/object/authenticated/${REVIEW_IMAGE_BUCKET}/`,
  ];
  for (const marker of markers) {
    const idx = raw.indexOf(marker);
    if (idx >= 0) {
      const rest = raw.slice(idx + marker.length).split("?")[0];
      try {
        return decodeURIComponent(rest);
      } catch {
        return rest;
      }
    }
  }

  const bare = raw.split("?")[0];
  if (!raw.startsWith("http") && /^[0-9a-f-]{36}\/[^/]+$/i.test(bare)) {
    return bare;
  }
  return null;
}

export function reviewImageStoragePaths(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return [...new Set(
    urls
      .filter((url): url is string => typeof url === "string")
      .map(reviewImagePathFromUrl)
      .filter((path): path is string => !!path),
  )];
}

export async function removeReviewImages(storage: ReviewStorage, urls: unknown): Promise<void> {
  const paths = reviewImageStoragePaths(urls);
  if (paths.length === 0) return;
  const { error } = await storage.from(REVIEW_IMAGE_BUCKET).remove(paths);
  if (error) console.warn("[review-images] delete failed", error.message);
}
