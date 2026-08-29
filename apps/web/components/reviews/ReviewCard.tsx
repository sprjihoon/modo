"use client";

import { useState } from "react";
import type { MyReview, PublicReview, ReviewStatus } from "@/lib/reviews";
import { reviewStatusLabel } from "@/lib/reviews";
import { StarRating } from "./StarRating";

function formatReviewDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function statusStyle(status: ReviewStatus) {
  if (status === "approved") return "bg-[#00C896]/10 text-[#00A07B]";
  if (status === "hidden") return "bg-gray-100 text-gray-500";
  return "bg-amber-50 text-amber-700";
}

export function ReviewCard({
  review,
  showStatus = false,
  compact = false,
}: {
  review: PublicReview | MyReview;
  showStatus?: boolean;
  compact?: boolean;
}) {
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);
  const status = "status" in review ? review.status : undefined;

  return (
    <article
      className={`p-4 bg-white border border-gray-100 rounded-2xl ${
        compact ? "h-[212px] flex flex-col" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-900">{review.display_name}</p>
          {review.repair_summary && (
            <p className="text-xs text-gray-400 mt-0.5">{review.repair_summary}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <StarRating value={review.rating} size="sm" />
          <p className="text-[11px] text-gray-400 mt-1">{formatReviewDate(review.reviewed_at)}</p>
        </div>
      </div>

      {showStatus && status && (
        <span className={`inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle(status)}`}>
          {reviewStatusLabel(status)}
        </span>
      )}

      <p
        className={`mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap ${
          compact ? "line-clamp-2 min-h-[40px]" : ""
        }`}
      >
        {review.content}
      </p>

      {(compact || review.photo_urls.length > 0) && (
        <div className={`mt-3 flex gap-2 overflow-x-auto ${compact ? "h-20 shrink-0" : ""}`}>
          {review.photo_urls.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => setOpenPhoto(url)}
              className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="리뷰 사진" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {openPhoto && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setOpenPhoto(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={openPhoto} alt="리뷰 사진 확대" className="max-w-full max-h-full rounded-lg object-contain" />
        </button>
      )}
    </article>
  );
}
