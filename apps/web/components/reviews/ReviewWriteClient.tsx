"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Scissors, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Analytics } from "@/lib/analytics";
import { REVIEW_PHOTO_MAX, type MyReview, type ReviewSettings } from "@/lib/reviews";
import { StarRating } from "./StarRating";
import { ReviewCard } from "./ReviewCard";

export function ReviewWriteClient({
  orderId,
  reviewId,
  preview = false,
}: {
  orderId?: string;
  reviewId?: string;
  preview?: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(reviewId);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemName, setItemName] = useState("수선");
  const [existing, setExisting] = useState<MyReview | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [settings, setSettings] = useState<ReviewSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState<MyReview | null>(null);

  useEffect(() => {
    if (preview) {
      setItemName("바지 · 기장수선");
      setSettings({
        text_review_points: 200,
        photo_review_points: 500,
        is_active: true,
        min_content_length: 10,
      });
      setCanWrite(true);
      setLoading(false);
      return;
    }
    if (reviewId) {
      Analytics.pageView("리뷰 수정", `/profile/reviews/${reviewId}/edit`);
      fetch(`/api/reviews/${reviewId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.error) {
            setError(json.error);
            return;
          }
          const review = json.review as MyReview;
          setExisting(review);
          setRating(review.rating);
          setContent(review.content);
          setPhotos(review.photo_urls ?? []);
          setItemName(json.order?.item_name || review.repair_summary || "수선");
          setSettings(json.settings ?? null);
          setCanWrite(true);
        })
        .catch(() => setError("리뷰 정보를 불러오지 못했습니다."))
        .finally(() => setLoading(false));
      return;
    }
    if (!orderId) {
      setError("주문을 찾을 수 없습니다.");
      setLoading(false);
      return;
    }
    Analytics.pageView("리뷰 작성", `/orders/${orderId}/review`);
    fetch(`/api/orders/${orderId}/review`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
          return;
        }
        setCanWrite(Boolean(json.canWrite));
        setExisting(json.review ?? null);
        setItemName(json.order?.item_name || "수선");
        setSettings(json.settings ?? null);
        if (json.canWrite) {
          Analytics.reviewStart(orderId);
        }
      })
      .catch(() => setError("리뷰 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [orderId, reviewId, preview]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remain = REVIEW_PHOTO_MAX - photos.length;
    if (remain <= 0) return;

    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      const next: string[] = [];
      for (const file of Array.from(files).slice(0, remain)) {
        if (!file.type.startsWith("image/")) continue;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("review-images")
          .upload(path, file, { contentType: file.type });
        if (uploadError) throw new Error(uploadError.message);
        const { data } = supabase.storage.from("review-images").getPublicUrl(path);
        next.push(data.publicUrl);
      }
      setPhotos((prev) => [...prev, ...next]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "사진 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (preview) {
      setError("디자인 미리보기에서는 등록되지 않습니다.");
      return;
    }
    if (rating < 1) {
      setError("별점을 선택해 주세요.");
      return;
    }
    const minLen = settings?.min_content_length ?? 10;
    if (content.trim().length < minLen) {
      setError(`리뷰는 ${minLen}자 이상 작성해 주세요.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(isEdit ? `/api/reviews/${reviewId}` : "/api/reviews", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          rating,
          content: content.trim(),
          photo_urls: photos,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || (isEdit ? "리뷰 수정에 실패했습니다." : "리뷰 등록에 실패했습니다."));
      if (!isEdit && orderId) {
        Analytics.reviewSubmit(orderId, rating, photos.length > 0);
      }
      setDone(json.review);
      setCanWrite(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : isEdit ? "리뷰 수정에 실패했습니다." : "리뷰 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="h-72 bg-gray-50 animate-pulse" />;
  }

  const shown = done ?? (isEdit ? null : existing);
  if (shown) {
    const points = shown.points_awarded ?? 0;
    return (
      <div className="px-5 pb-10">
        <div className="mt-5 p-5 bg-[#00C896]/5 rounded-2xl">
          <p className="text-base font-bold text-gray-900">
            {done
              ? isEdit
                ? "리뷰가 수정되었습니다"
                : "리뷰가 등록되었습니다"
              : "이미 작성한 리뷰입니다"}
          </p>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {done && isEdit
              ? "수정한 내용은 검수 후 다시 공개됩니다."
              : shown.status === "approved"
                ? "다른 고객에게 공개된 리뷰입니다."
                : shown.status === "hidden"
                  ? "현재 비공개입니다. 작성하신 내용은 계속 볼 수 있습니다."
                  : "검수 후 다른 고객에게 보여집니다."}
          </p>
          {done && points > 0 && (
            <p className="text-sm font-bold text-[#00C896] mt-2">
              {points.toLocaleString("ko-KR")}P가 적립되었습니다
            </p>
          )}
        </div>
        <div className="mt-4">
          <ReviewCard review={shown} showStatus />
        </div>
        {existing && !done && (
          <Link
            href="/profile/reviews"
            className="mt-3 block w-full py-3.5 rounded-2xl border border-gray-200 text-center text-sm font-bold text-gray-700"
          >
            내 리뷰에서 수정·삭제
          </Link>
        )}
        <button
          type="button"
          onClick={() => router.push(isEdit ? "/profile/reviews" : "/reviews")}
          className="mt-5 w-full py-3.5 rounded-2xl bg-[#00C896] text-white font-bold text-sm"
        >
          {isEdit ? "내 리뷰로" : "전체 리뷰 보기"}
        </button>
      </div>
    );
  }

  if (!canWrite) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-sm text-gray-500">{error || "이 주문은 리뷰를 작성할 수 없습니다."}</p>
      </div>
    );
  }

  const emptySlots = Math.max(1, Math.min(3, REVIEW_PHOTO_MAX - photos.length));
  const textPoints = settings?.text_review_points ?? 200;
  const photoPoints = settings?.photo_review_points ?? 500;
  const placeholder = settings?.is_active
    ? `리뷰를 남겨 주시면 글 ${textPoints.toLocaleString("ko-KR")}P, 사진 포함 시 ${photoPoints.toLocaleString("ko-KR")}P가 적립됩니다.`
    : "수선 결과를 알려 주세요.";

  return (
    <div className="pb-8">
      <section className="bg-[#F4FBF8] px-5 pt-6 pb-7 text-center">
        <div className="mx-auto w-24 h-24 rounded-full bg-[#00C896]/15 flex items-center justify-center">
          <Scissors className="w-10 h-10 text-[#00C896]" strokeWidth={1.6} />
        </div>
        <p className="mt-4 text-[15px] font-bold text-gray-900 leading-snug">{itemName}</p>
      </section>

      <div className="px-5 pt-7 space-y-7">
        <section className="text-center">
          <p className="text-[15px] font-bold text-gray-800">수선을 평가해 주세요!</p>
          <div className="mt-4">
            <StarRating value={rating} onChange={setRating} size="xl" color="brand" />
          </div>
        </section>

        <section>
          <p className="text-[15px] font-bold text-gray-800">사진 첨부</p>
          <div className="mt-3 flex gap-2.5">
            {photos.map((url) => (
              <div key={url} className="relative w-[88px] h-[88px] shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover rounded-2xl bg-gray-100" />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((p) => p !== url))}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-[#00C896] text-white rounded-full flex items-center justify-center shadow-sm"
                  aria-label="사진 삭제"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {photos.length < REVIEW_PHOTO_MAX &&
              Array.from({ length: emptySlots }).map((_, i) => (
                <label
                  key={`add-${i}`}
                  className="w-[88px] h-[88px] shrink-0 rounded-2xl border border-gray-200 bg-white flex items-center justify-center text-gray-300 active:bg-gray-50"
                >
                  <Plus className="w-7 h-7" strokeWidth={1.75} />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      handleFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              ))}
          </div>
        </section>

        <section>
          <p className="text-[15px] font-bold text-gray-800">리뷰 작성</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            maxLength={1000}
            placeholder={placeholder}
            className="mt-3 w-full min-h-[140px] p-4 border border-gray-200 rounded-2xl text-sm leading-relaxed resize-none placeholder:text-gray-400 focus:outline-none focus:border-[#00C896]"
          />
        </section>

        {error && <p className="text-sm text-red-500 -mt-3">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || uploading}
          className="w-full py-4 rounded-2xl bg-[#00C896] text-white font-bold text-[15px] disabled:opacity-50"
        >
          {submitting ? (isEdit ? "수정 중..." : "등록 중...") : isEdit ? "리뷰 수정" : "리뷰 등록"}
        </button>
        <p className="-mt-4 text-center text-xs text-gray-400">
          {isEdit ? "수정 후 다시 검수를 거쳐 다른 고객에게 보여집니다" : "등록 후 검수를 거쳐 다른 고객에게 보여집니다"}
        </p>
      </div>
    </div>
  );
}
