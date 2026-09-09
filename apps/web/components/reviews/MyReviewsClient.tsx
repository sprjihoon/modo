"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MyReview } from "@/lib/reviews";
import type { PendingReviewOrder } from "@/lib/pending-reviews";
import {
  editReviewHref,
  mineErrorMessage,
  resolveMyReviewsView,
  reviewOrderHref,
  writeReviewHref,
} from "@/lib/my-reviews-flow";
import { ReviewCard } from "./ReviewCard";

export function MyReviewsClient() {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingReviewOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    return fetch("/api/reviews/mine")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(mineErrorMessage(json.error) ?? json.error);
          setReviews([]);
          setPendingOrders([]);
          return;
        }
        setError(null);
        setReviews(json.reviews ?? []);
        setPendingOrders(json.pendingOrders ?? []);
      })
      .catch(() => setError("리뷰를 불러오지 못했습니다."));
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function handleDelete(review: MyReview) {
    if (!confirm("이 리뷰를 삭제할까요? 첨부된 사진도 함께 삭제되며 복구할 수 없습니다.")) return;
    setBusyId(review.id);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "삭제에 실패했습니다.");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  const view = resolveMyReviewsView({ loading, error, reviews, pendingOrders });

  if (view.kind === "loading") {
    return (
      <div className="px-4 mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (view.kind === "error") {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-sm text-gray-500">{view.message}</p>
      </div>
    );
  }

  if (view.kind === "empty") {
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
    <div className="px-4 mt-4 pb-10 space-y-6">
      {view.pendingOrders.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-gray-400 px-1">작성할 리뷰</p>
          {view.pendingOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between gap-3 p-4 bg-white border border-gray-100 rounded-2xl"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{order.item_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">배송 완료 · 리뷰 작성 시 포인트 지급</p>
              </div>
              <Link
                href={writeReviewHref(order.id)}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-[#00C896] text-white text-xs font-bold"
              >
                작성하기
              </Link>
            </div>
          ))}
        </section>
      )}

      {view.reviews.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-gray-400 px-1">
            홈 노출이나 전체 공개 여부와 상관없이, 작성한 리뷰는 여기서 항상 볼 수 있습니다.
          </p>
          {view.reviews.map((item) => (
            <div key={item.id} className="space-y-2">
              <ReviewCard review={item} showStatus />
              <div className="flex items-center justify-between px-1">
                <Link href={reviewOrderHref(item.order_id)} className="text-xs text-gray-400">
                  주문 상세 보기
                </Link>
                <div className="flex items-center gap-3">
                  <Link
                    href={editReviewHref(item.id)}
                    className="text-xs font-semibold text-[#00C896]"
                  >
                    수정
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => handleDelete(item)}
                    className="text-xs font-semibold text-red-500 disabled:opacity-50"
                  >
                    {busyId === item.id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
