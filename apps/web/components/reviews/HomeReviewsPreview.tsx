"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { PublicReview } from "@/lib/reviews";
import {
  PREVIEW_AVERAGE,
  PREVIEW_COUNT,
  PREVIEW_REVIEWS,
  withSampleReviews,
} from "@/lib/review-preview";
import { StarRating } from "./StarRating";

const ROTATE_MS = 4500;

function isPhotoReview(review: PublicReview) {
  return review.photo_urls.length > 0;
}

function sliceWindow(list: PublicReview[], offset: number, count: number) {
  if (list.length <= count) return list;
  return Array.from({ length: count }, (_, i) => list[(offset + i) % list.length]);
}

function PhotoTile({ review }: { review: PublicReview }) {
  return (
    <article className="bg-white rounded-2xl overflow-hidden border border-gray-100">
      <div className="relative aspect-[4/3] bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={review.photo_urls[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <div className="p-2.5">
        <StarRating value={review.rating} size="sm" />
        <p className="mt-1 text-xs font-bold text-gray-900 truncate">{review.display_name}</p>
        <p className="mt-0.5 text-[11px] text-gray-500 leading-snug line-clamp-2 min-h-[30px]">
          {review.content}
        </p>
      </div>
    </article>
  );
}

function TextTile({ review }: { review: PublicReview }) {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 px-3 py-2.5 h-[92px] flex flex-col">
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs font-bold text-gray-900 truncate">{review.display_name}</p>
        <StarRating value={review.rating} size="sm" />
      </div>
      <p className="mt-1.5 text-[11px] text-gray-500 leading-snug line-clamp-2">
        {review.content}
      </p>
    </article>
  );
}

export function HomeReviewsPreview({ preview = false }: { preview?: boolean }) {
  const [reviews, setReviews] = useState<PublicReview[]>(preview ? PREVIEW_REVIEWS : []);
  const [average, setAverage] = useState(preview ? PREVIEW_AVERAGE : 0);
  const [count, setCount] = useState(preview ? PREVIEW_COUNT : 0);
  const [ready, setReady] = useState(preview);
  const [photoOffset, setPhotoOffset] = useState(0);
  const [textOffset, setTextOffset] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (preview) {
      setReviews(PREVIEW_REVIEWS);
      setAverage(PREVIEW_AVERAGE);
      setCount(PREVIEW_COUNT);
      setReady(true);
      return;
    }
    let cancelled = false;
    fetch("/api/reviews?home=1&limit=20")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        const list = json?.reviews ?? [];
        if (list.length > 0) {
          setReviews(list);
          setAverage(typeof json?.average === "number" ? json.average : 0);
          setCount(typeof json?.count === "number" ? json.count : list.length);
          return;
        }
        const next = withSampleReviews([]);
        setReviews(next.reviews);
        setAverage(next.average);
        setCount(next.count);
      })
      .catch(() => {
        const next = withSampleReviews([]);
        setReviews(next.reviews);
        setAverage(next.average);
        setCount(next.count);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [preview]);

  const photos = reviews.filter(isPhotoReview);
  const texts = reviews.filter((review) => !isPhotoReview(review));

  const textOnly = photos.length === 0;
  const textVisibleCount = textOnly ? 4 : 2;

  useEffect(() => {
    const rotatePhotos = photos.length > 2;
    const rotateTexts = texts.length > textVisibleCount;
    if (!rotatePhotos && !rotateTexts) return;
    let fadeTimer = 0;
    const tick = window.setInterval(() => {
      setFading(true);
      fadeTimer = window.setTimeout(() => {
        if (rotatePhotos) setPhotoOffset((n) => (n + 1) % photos.length);
        if (rotateTexts) setTextOffset((n) => (n + 1) % texts.length);
        setFading(false);
      }, 280);
    }, ROTATE_MS);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(fadeTimer);
    };
  }, [photos.length, texts.length, textVisibleCount]);

  const visiblePhotos = sliceWindow(photos, photoOffset, 2);
  const visibleTexts = sliceWindow(texts, textOffset, textVisibleCount);

  return (
    <section className="mt-8 bg-[#F7F8F8] pt-6 pb-3">
      <div className="flex items-center justify-between px-5 mb-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">고객 리뷰</h2>
          {ready && count > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              <StarRating value={Math.round(average)} size="sm" />
              <span className="text-sm font-bold text-gray-800">{average.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({count}개)</span>
            </div>
          )}
        </div>
        <Link
          href="/reviews"
          className="flex items-center gap-0.5 text-xs text-gray-400 active:opacity-60"
        >
          전체보기
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className={`px-4 space-y-2.5 transition-opacity duration-300 ${fading ? "opacity-0" : "opacity-100"}`}>
        {!ready ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-white animate-pulse aspect-[4/3]" />
              <div className="rounded-2xl bg-white animate-pulse aspect-[4/3]" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-white animate-pulse h-[92px]" />
              <div className="rounded-2xl bg-white animate-pulse h-[92px]" />
            </div>
          </>
        ) : reviews.length === 0 ? (
          <div className="p-5 bg-white rounded-2xl text-center">
            <p className="text-sm text-gray-500">아직 공개된 리뷰가 없습니다</p>
          </div>
        ) : (
          <>
            {visiblePhotos.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5">
                {visiblePhotos.map((review) => (
                  <PhotoTile key={review.id} review={review} />
                ))}
              </div>
            )}
            {visibleTexts.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5">
                {visibleTexts.map((review) => (
                  <TextTile key={review.id} review={review} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
