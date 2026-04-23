import { createClient } from "@/lib/supabase/server";
import Image from "next/image";

interface LegalContentViewProps {
  contentKey: "terms_of_service" | "privacy_policy" | "refund_policy";
  fallbackTitle: string;
}

interface AppContentRow {
  content: string | null;
  images: string[] | null;
  updated_at: string | null;
}

export async function LegalContentView({
  contentKey,
  fallbackTitle,
}: LegalContentViewProps) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_contents")
    .select("content, images, updated_at")
    .eq("key", contentKey)
    .maybeSingle<AppContentRow>();

  const text = data?.content?.trim() ?? "";
  const images = Array.isArray(data?.images) ? data!.images! : [];
  const updatedAt = data?.updated_at;

  if (!text && images.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-gray-500">
          {fallbackTitle} 내용이 아직 등록되지 않았습니다.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          관리자가 곧 등록할 예정입니다.
        </p>
      </div>
    );
  }

  return (
    <article className="px-4 py-6">
      {updatedAt && (
        <p className="mb-4 text-xs text-gray-400">
          최종 업데이트: {formatDate(updatedAt)}
        </p>
      )}

      {text && (
        <pre className="whitespace-pre-wrap break-words font-sans text-[14px] leading-7 text-gray-800">
          {text}
        </pre>
      )}

      {images.length > 0 && (
        <div className="mt-6 space-y-4">
          {images.map((url) => (
            <div
              key={url}
              className="relative w-full overflow-hidden rounded-xl border border-gray-100"
              style={{ aspectRatio: "4 / 3" }}
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="(max-width: 430px) 100vw, 430px"
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  } catch {
    return iso;
  }
}
