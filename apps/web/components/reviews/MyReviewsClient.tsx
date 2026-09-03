"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MyReview } from "@/lib/reviews";
import { ReviewCard } from "./ReviewCard";

export function MyReviewsClient() {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reviews/mine")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error === "Unauthorized" ? "로그인 후 내 리뷰를 볼 수 있습니다." : json.error);
          return;
        }
        setReviews(json.reviews ?? []);
      })
      .catch(() => setError("리뷰를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(review: MyReview) {
    if (!confirm("이 리뷰를 삭제할까요? 첨부된 사진도 함께 삭제되며 복구할 수 없습니다.")) return;
    setBusyId(review.id);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "삭제에 실패했습니다.");
      setReviews((prev) => prev.filter((item) => item.id !== review.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="px-4 mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-sm text-gray-500">{error}</p>
        {error.includes("로그인") && (
          <Link href="/login?redirectTo=/profile/reviews" className="inline-block mt-4 text-sm font-semibold text-[#00C896]">
            로그인
          </Link>
        )}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-sm text-gray-500">아직 작성한 리뷰가 없습니다.</p>
        <p className="text-xs text-gray-400 mt-1">배송이 완료된 주문에서 리뷰를 남길 수 있습니다.</p>
        <Link href="/orders" className="inline-block mt-4 text-sm font-semibold text-[#00C896]">
          주문 내역 보기
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 mt-4 pb-10 space-y-3">
      <p className="text-xs text-gray-400 px-1">
        홈 노출이나 전체 공개 여부와 상관없이, 작성한 리뷰는 여기서 항상 볼 수 있습니다.
      </p>
      {reviews.map((review) => (
        <div key={review.id} className="space-y-2">
          <ReviewCard review={review} showStatus />
          <div className="flex items-center justify-between px-1">
            <Link href={`/orders/${review.order_id}`} className="text-xs text-gray-400">
              주문 상세 보기
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href={`/profile/reviews/${review.id}/edit`}
                className="text-xs font-semibold text-[#00C896]"
              >
                수정
              </Link>
              <button
                type="button"
                disabled={busyId === review.id}
                onClick={() => handleDelete(review)}
                className="text-xs font-semibold text-red-500 disabled:opacity-50"
              >
                {busyId === review.id ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
