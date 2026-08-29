"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MyReview, PublicReview } from "@/lib/reviews";
import { ReviewCard } from "./ReviewCard";

type Sort = "rating" | "recent";

function applyListView(reviews: PublicReview[], sort: Sort, photoOnly: boolean) {
  const filtered = photoOnly ? reviews.filter((review) => review.photo_urls.length > 0) : reviews;
  return [...filtered].sort((a, b) => {
    if (sort === "recent") {
      return new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime();
    }
    if (b.rating !== a.rating) return b.rating - a.rating;
    return new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime();
  });
}

export function ReviewsListClient() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [mine, setMine] = useState<MyReview[]>([]);
  const [sort, setSort] = useState<Sort>("rating");
  const [photoOnly, setPhotoOnly] = useState(false);
  const [clothing, setClothing] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({
      sort,
      limit: "50",
      ...(photoOnly ? { photo: "1" } : {}),
      ...(clothing ? { clothing } : {}),
    });
    fetch(`/api/reviews?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        const list = Array.isArray(json?.reviews) ? (json.reviews as PublicReview[]) : [];
        const myList = Array.isArray(json?.mine) ? (json.mine as MyReview[]) : [];
        setMine(myList);
        const mineIds = new Set(myList.map((review) => review.id));
        setReviews(applyListView(list.filter((review) => !mineIds.has(review.id)), sort, photoOnly));
        if (Array.isArray(json?.categories)) {
          setCategories((json.categories as unknown[]).filter((name): name is string => typeof name === "string" && name.trim().length > 0));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setReviews([]);
        setMine([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sort, photoOnly, clothing]);

  return (
    <div className="pb-10">
      {mine.length > 0 && (
        <section className="px-4 mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-900">내 리뷰</p>
            <Link href="/profile/reviews" className="text-xs font-semibold text-[#00C896]">
              수정·삭제
            </Link>
          </div>
          <p className="text-[11px] text-gray-400 mb-2">
            홈이나 전체 공개와 상관없이 작성한 리뷰는 항상 볼 수 있습니다.
          </p>
          <div className="space-y-3">
            {mine.map((review) => (
              <ReviewCard key={review.id} review={review} showStatus />
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-2 px-4 mt-5">
        <button
          type="button"
          onClick={() => setSort("rating")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
            sort === "rating" ? "bg-[#00C896] text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          별점순
        </button>
        <button
          type="button"
          onClick={() => setSort("recent")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
            sort === "recent" ? "bg-[#00C896] text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          최신순
        </button>
        <button
          type="button"
          onClick={() => setPhotoOnly((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
            photoOnly ? "bg-[#00C896] text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          포토리뷰
        </button>
      </div>

      {categories.length > 0 && (
        <div className="mt-3">
          <p className="px-4 text-[11px] font-semibold text-gray-400 mb-2">수선 종류</p>
          <div className="flex items-center gap-2 px-4 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setClothing("")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                clothing === "" ? "bg-[#00C896] text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              전체
            </button>
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setClothing(name)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  clothing === name ? "bg-[#00C896] text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-500">
              {clothing && photoOnly
                ? "해당 수선 종류의 포토리뷰가 없습니다."
                : clothing
                  ? "해당 수선 종류의 리뷰가 없습니다."
                  : photoOnly
                    ? "포토리뷰가 없습니다."
                    : "아직 공개된 리뷰가 없습니다."}
            </p>
          </div>
        ) : (
          reviews.map((review) => <ReviewCard key={review.id} review={review} />)
        )}
      </div>
    </div>
  );
}
