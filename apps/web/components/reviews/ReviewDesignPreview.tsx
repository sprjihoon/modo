"use client";

import { useMemo, useState } from "react";
import { ReviewInvitePopup } from "./ReviewInvitePopup";
import { ReviewCard } from "./ReviewCard";
import type { MyReview } from "@/lib/reviews";
import {
  applyDeleteSuccess,
  applyWriteSuccess,
  editReviewHref,
  resolveMyReviewsView,
  reviewOrderHref,
  writeReviewHref,
} from "@/lib/my-reviews-flow";

const MOCK_REVIEW: MyReview = {
  id: "preview",
  order_id: "o1",
  rating: 5,
  content: "기장이 딱 맞게 줄여졌어요. 마감도 깔끔합니다.",
  photo_urls: [],
  display_name: "고**",
  repair_summary: "바지 · 기장수선",
  clothing_type: "바지",
  points_type: "text",
  reviewed_at: "2026-08-20T00:00:00.000Z",
  status: "pending",
  points_awarded: 200,
};

const MOCK_PENDING = { id: "o1", item_name: "바지 · 기장수선" };

type Scene = "popup" | "empty" | "pending" | "written";

export function ReviewDesignPreview() {
  const [scene, setScene] = useState<Scene>("popup");
  const [popupOpen, setPopupOpen] = useState(true);
  const [pendingOrders, setPendingOrders] = useState([MOCK_PENDING]);
  const [reviews, setReviews] = useState<MyReview[]>([]);

  const view = useMemo(() => {
    if (scene === "empty") return resolveMyReviewsView({ reviews: [], pendingOrders: [] });
    if (scene === "pending") return resolveMyReviewsView({ reviews: [], pendingOrders: [MOCK_PENDING] });
    if (scene === "written") return resolveMyReviewsView({ reviews: [MOCK_REVIEW], pendingOrders: [] });
    return resolveMyReviewsView({ reviews, pendingOrders });
  }, [scene, reviews, pendingOrders]);

  function writeDemo() {
    const next = applyWriteSuccess(pendingOrders, reviews, MOCK_REVIEW);
    setPendingOrders(next.pendingOrders);
    setReviews(next.reviews);
    setScene("written");
    setPopupOpen(false);
  }

  function deleteDemo() {
    const next = applyDeleteSuccess(pendingOrders, reviews.length ? reviews : [MOCK_REVIEW], {
      id: MOCK_REVIEW.id,
      order_id: MOCK_REVIEW.order_id,
      item_name: MOCK_PENDING.item_name,
    });
    setPendingOrders(next.pendingOrders);
    setReviews(next.reviews);
    setScene("pending");
  }

  return (
    <div className="px-4 pt-5 pb-10">
      <p className="text-sm text-gray-500 leading-relaxed">
        미리보기입니다. 실제 주문에는 등록되지 않습니다.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ["popup", "홈 팝업"],
            ["empty", "빈 화면"],
            ["pending", "작성하기"],
            ["written", "수정·삭제"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setScene(id);
              setPopupOpen(id === "popup");
              if (id === "pending") {
                setPendingOrders([MOCK_PENDING]);
                setReviews([]);
              }
              if (id === "written") {
                setPendingOrders([]);
                setReviews([MOCK_REVIEW]);
              }
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              scene === id ? "bg-[#00C896] text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view.kind === "empty" && (
        <div className="px-1 py-16 text-center">
          <p className="text-sm text-gray-500">아직 작성한 리뷰가 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">배송이 완료된 주문에서 리뷰를 남길 수 있습니다.</p>
          <p className="mt-4 text-sm font-semibold text-[#00C896]">주문 내역 보기</p>
        </div>
      )}

      {view.kind === "list" && (
        <div className="mt-6 space-y-6">
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
                    <p className="text-[11px] text-gray-300 mt-1">{writeReviewHref(order.id)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={writeDemo}
                    className="shrink-0 px-3.5 py-2 rounded-xl bg-[#00C896] text-white text-xs font-bold"
                  >
                    작성하기
                  </button>
                </div>
              ))}
            </section>
          )}

          {view.reviews.length > 0 && (
            <section className="space-y-3">
              <p className="text-xs text-gray-400 px-1">작성한 리뷰 · 수정·삭제</p>
              {view.reviews.map((item) => (
                <div key={item.id} className="space-y-2">
                  <ReviewCard review={item} showStatus />
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-gray-400">{reviewOrderHref(item.order_id)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#00C896]">{editReviewHref(item.id).includes("/edit") ? "수정" : ""}</span>
                      <button
                        type="button"
                        onClick={deleteDemo}
                        className="text-xs font-semibold text-red-500"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      {scene === "popup" && (
        <ReviewInvitePopup preview open={popupOpen} onOpenChange={setPopupOpen} />
      )}
    </div>
  );
}
