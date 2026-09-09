"use client";

import { useEffect, useState } from "react";
import { Gift, X } from "lucide-react";
import type { ReviewSettings } from "@/lib/reviews";
import { REVIEW_INVITE_DISMISS_KEY, shouldAutoShowReviewInvite } from "@/lib/pending-reviews";
import { ReviewWriteClient } from "./ReviewWriteClient";

function isDismissed() {
  try {
    return localStorage.getItem(REVIEW_INVITE_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function persistDismiss() {
  try {
    localStorage.setItem(REVIEW_INVITE_DISMISS_KEY, "1");
  } catch {
    // ignore
  }
}

export function ReviewInvitePopup({
  preview = false,
  open: openProp,
  onOpenChange,
}: {
  preview?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const controlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(preview);
  const open = controlled ? openProp : internalOpen;
  const [step, setStep] = useState<"invite" | "write">("invite");
  const [orderId, setOrderId] = useState(preview ? "preview" : "");
  const [itemName, setItemName] = useState(preview ? "바지 · 기장수선" : "수선");
  const [settings, setSettings] = useState<ReviewSettings>({
    text_review_points: 200,
    photo_review_points: 500,
    is_active: true,
    min_content_length: 10,
  });

  useEffect(() => {
    if (preview) return;
    if (isDismissed()) return;

    let cancelled = false;
    fetch("/api/reviews/pending")
      .then((res) => res.json())
      .then((json) => {
        if (
          cancelled ||
          !shouldAutoShowReviewInvite({
            dismissed: false,
            pendingOrderId: json.order?.id,
          })
        ) {
          return;
        }
        setOrderId(json.order.id);
        setItemName(json.order.item_name || "수선");
        if (json.settings) setSettings(json.settings);
        if (controlled) onOpenChange?.(true);
        else setInternalOpen(true);
      })
      .catch(() => {
        // 팝업 로드 실패 시 표시하지 않음
      });

    return () => {
      cancelled = true;
    };
  }, [preview]);

  function close() {
    if (!preview) persistDismiss();
    if (controlled) onOpenChange?.(false);
    else setInternalOpen(false);
    setStep("invite");
  }

  if (!open) return null;

  const textPoints = settings.text_review_points.toLocaleString("ko-KR");
  const photoPoints = settings.photo_review_points.toLocaleString("ko-KR");

  return (
    <div className="fixed inset-0 z-[50] flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={close} />

      <div
        className="relative bg-white w-full max-w-[360px] max-h-[90vh] overflow-y-auto rounded-2xl animate-fade-in shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          className="absolute top-4 right-4 z-10 p-1 active:opacity-60"
          aria-label="닫기"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {step === "invite" ? (
          <div className="px-6 pt-6 pb-5">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-[#00C896]/12 flex items-center justify-center">
              <Gift className="w-7 h-7 text-[#00C896]" strokeWidth={1.7} />
            </div>
            <p className="text-xs font-semibold tracking-wide text-[#00C896] text-center mb-2">
              배송이 완료되었습니다
            </p>
            <h2 className="text-xl font-bold text-gray-900 leading-snug text-center">
              리뷰를 작성해 주시면
              <br />
              <span className="text-[#00C896]">포인트가 지급</span>됩니다
            </h2>
            <p className="mt-3 text-sm text-gray-500 text-center leading-relaxed">
              {itemName}
            </p>
            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3.5 text-center">
              <p className="text-sm font-bold text-gray-900">
                글 리뷰 {textPoints}P · 사진 포함 시 {photoPoints}P
              </p>
              <p className="text-xs text-gray-500 mt-1">
                닫으면 다시 표시되지 않습니다. 이후에는 마이페이지 → 내 리뷰에서 작성할 수 있습니다.
              </p>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={close}
                className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 active:bg-gray-50"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => setStep("write")}
                className="flex-1 py-3.5 rounded-2xl bg-[#00C896] text-white text-sm font-bold active:bg-[#00A07B]"
              >
                작성하기
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-12 pb-2">
            <ReviewWriteClient
              orderId={orderId}
              preview={preview}
              compact
              onClose={close}
            />
          </div>
        )}
      </div>
    </div>
  );
}
