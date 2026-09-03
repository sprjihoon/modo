"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Star } from "lucide-react";

type Tab = "pending" | "approved" | "hidden" | "home";

interface AdminReview {
  id: string;
  order_id: string;
  rating: number;
  content: string;
  photo_urls: string[];
  status: string;
  display_name: string;
  repair_summary: string | null;
  points_awarded: number;
  points_type: string | null;
  is_featured: boolean;
  display_order: number;
  reviewed_at: string;
  customer_name: string;
  customer_email: string;
  order_item_name: string | null;
}

function ReviewMeta({ review }: { review: AdminReview }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-semibold">{review.rating}점</span>
        <span className="text-xs text-muted-foreground">
          {review.photo_urls.length > 0 || review.points_type === "photo" ? "포토" : "글"} ·{" "}
          {review.points_awarded}P
        </span>
        {review.is_featured && (
          <span className="text-[11px] font-semibold text-[#00C896] bg-[#00C896]/10 px-1.5 py-0.5 rounded">
            홈 노출
          </span>
        )}
      </div>
      <p className="text-sm mt-1">
        공개명 <b>{review.display_name}</b>
        <span className="text-muted-foreground">
          {" "}
          · 실명 {review.customer_name || "-"} ({review.customer_email || "-"})
        </span>
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {review.order_item_name || review.repair_summary || "수선"} ·{" "}
        {new Date(review.reviewed_at).toLocaleString("ko-KR")}
      </p>
    </>
  );
}

function ReviewBody({ review }: { review: AdminReview }) {
  return (
    <>
      <p className="text-sm whitespace-pre-wrap">{review.content}</p>
      {review.photo_urls.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {review.photo_urls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border" />
            </a>
          ))}
        </div>
      )}
    </>
  );
}

export default function ReviewsAdminPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const listStatus = tab === "home" ? "approved" : tab;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reviews?status=${listStatus}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "조회 실패");
      setReviews(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, [listStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const featured = useMemo(
    () =>
      reviews
        .filter((review) => review.is_featured)
        .sort((a, b) => a.display_order - b.display_order || a.reviewed_at.localeCompare(b.reviewed_at)),
    [reviews]
  );
  const pool = useMemo(
    () => reviews.filter((review) => !review.is_featured && review.status === "approved"),
    [reviews]
  );

  async function setStatus(id: string, status: "approved" | "hidden" | "pending") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "처리 실패");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function setFeatured(id: string, is_featured: boolean) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "처리 실패");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReview(id: string) {
    if (!confirm("이 리뷰를 삭제할까요? 첨부된 사진도 함께 삭제되며 복구할 수 없습니다.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "삭제 실패");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function moveFeatured(id: string, direction: "up" | "down") {
    const currentIndex = featured.findIndex((review) => review.id === id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= featured.length) return;

    const nextIds = featured.map((review) => review.id);
    const [moved] = nextIds.splice(currentIndex, 1);
    nextIds.splice(targetIndex, 0, moved);

    setBusyId(id);
    try {
      const res = await fetch("/api/admin/reviews/featured-order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: nextIds }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "순서 변경 실패");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "순서 변경 실패");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">리뷰 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          검수 대기 리뷰를 승인해야 고객 홈·리뷰 게시판에 노출됩니다. 홈에 보여줄 리뷰와 순서는{" "}
          <button type="button" className="text-blue-600 underline" onClick={() => setTab("home")}>
            홈 노출
          </button>
          에서 고를 수 있습니다.{" "}
          <Link href="/dashboard/points?tab=reviews" className="text-blue-600 underline">
            리뷰 적립 금액 설정
          </Link>
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(
          [
            ["pending", "검수 대기"],
            ["approved", "공개"],
            ["hidden", "숨김"],
            ["home", "홈 노출"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={tab === value ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(value)}
          >
            {label}
            {value === "home" && featured.length > 0 ? ` (${featured.length})` : ""}
          </Button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : tab === "home" ? (
        <div className="space-y-8">
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">홈에 나가는 리뷰</h2>
              <p className="text-xs text-muted-foreground mt-1">
                위에서부터 순서대로 노출됩니다. 사진 리뷰는 위 2칸, 글 리뷰는 아래 2칸에 들어갑니다.
                사진이 없으면 글 리뷰 4개가 나갑니다. 지정하지 않으면 공개 리뷰가 자동으로 골라집니다.
              </p>
            </div>
            {featured.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                아직 고른 리뷰가 없습니다. 아래에서 홈에 올릴 리뷰를 선택해 주세요.
              </p>
            ) : (
              <div className="space-y-3">
                {featured.map((review, index) => (
                  <div key={review.id} className="rounded-xl border bg-white p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-sm font-bold text-gray-400 w-6 shrink-0 pt-0.5">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <ReviewMeta review={review} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          disabled={busyId === review.id || index === 0}
                          onClick={() => moveFeatured(review.id, "up")}
                          aria-label="위로"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          disabled={busyId === review.id || index === featured.length - 1}
                          onClick={() => moveFeatured(review.id, "down")}
                          aria-label="아래로"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <ReviewBody review={review} />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === review.id}
                        onClick={() => setFeatured(review.id, false)}
                      >
                        홈에서 내리기
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        disabled={busyId === review.id}
                        onClick={() => deleteReview(review.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">공개 리뷰에서 추가</h2>
            {pool.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                추가할 공개 리뷰가 없습니다. 검수 대기 리뷰를 먼저 승인해 주세요.
              </p>
            ) : (
              <div className="space-y-3">
                {pool.map((review) => (
                  <div key={review.id} className="rounded-xl border bg-white p-4 space-y-3">
                    <ReviewMeta review={review} />
                    <ReviewBody review={review} />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === review.id}
                        onClick={() => setFeatured(review.id, true)}
                      >
                        홈에 올리기
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        disabled={busyId === review.id}
                        onClick={() => deleteReview(review.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">해당 상태의 리뷰가 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border bg-white p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <ReviewMeta review={review} />
                </div>
                <Link
                  href={`/dashboard/orders/${review.order_id}`}
                  className="text-xs text-blue-600 shrink-0"
                >
                  주문 보기
                </Link>
              </div>

              <ReviewBody review={review} />

              <div className="flex gap-2 flex-wrap">
                {review.status !== "approved" && (
                  <Button
                    size="sm"
                    disabled={busyId === review.id}
                    onClick={() => setStatus(review.id, "approved")}
                  >
                    승인 (공개)
                  </Button>
                )}
                {review.status === "approved" && !review.is_featured && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === review.id}
                    onClick={() => setFeatured(review.id, true)}
                  >
                    홈에 올리기
                  </Button>
                )}
                {review.status === "approved" && review.is_featured && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === review.id}
                    onClick={() => setFeatured(review.id, false)}
                  >
                    홈에서 내리기
                  </Button>
                )}
                {review.status !== "hidden" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === review.id}
                    onClick={() => setStatus(review.id, "hidden")}
                  >
                    숨김
                  </Button>
                )}
                {review.status !== "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === review.id}
                    onClick={() => setStatus(review.id, "pending")}
                  >
                    대기로
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  disabled={busyId === review.id}
                  onClick={() => deleteReview(review.id)}
                >
                  삭제
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
