"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils";
import { APP_DOWNLOAD_PATH } from "@/lib/app-stores";
import { classifyWalletCoupon, type CouponWalletStatus } from "@/lib/promotion-eval";
import { AppDownloadLinks } from "@/components/home/AppDownloadLinks";

interface WalletCoupon {
  id: string;
  code: string;
  description?: string | null;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  used_count: number;
  max_uses: number | null;
  valid_until: string | null;
  min_order_amount?: number | null;
}

const STATUS_LABEL: Record<CouponWalletStatus, string> = {
  usable: "사용가능",
  used: "사용완료",
  expired: "만료",
  inactive: "비활성",
};

function couponStatus(row: WalletCoupon, now: Date): CouponWalletStatus {
  return classifyWalletCoupon({
    isActive: row.is_active,
    now,
    validUntil: row.valid_until ? new Date(row.valid_until) : null,
    usedCount: row.used_count ?? 0,
    maxUses: row.max_uses ?? 1,
  });
}

function discountLabel(row: WalletCoupon): string {
  return row.discount_type === "PERCENTAGE"
    ? `${row.discount_value}% 할인`
    : `${formatPrice(row.discount_value)} 할인`;
}

export function CouponsClient() {
  const [coupons, setCoupons] = useState<WalletCoupon[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadCoupons();
  }, []);

  async function loadCoupons() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setIsLoggedIn(true);

      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (!userRow) return;

      const { data } = await supabase
        .from("promotion_codes")
        .select(
          "id, code, description, discount_type, discount_value, is_active, used_count, max_uses, valid_until, min_order_amount"
        )
        .eq("assigned_user_id", userRow.id)
        .order("created_at", { ascending: false });

      setCoupons((data as WalletCoupon[]) ?? []);
    } catch {
      // 에러 무시
    } finally {
      setIsLoading(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // 클립보드 권한 없음
    }
  }

  if (!isLoggedIn && !isLoading) {
    return (
      <div className="py-16 text-center px-5">
        <p className="text-gray-500 text-sm mb-4">로그인 후 쿠폰을 확인할 수 있습니다</p>
        <Link href="/login" className="btn-brand inline-block px-8 py-3">
          로그인
        </Link>
      </div>
    );
  }

  const now = new Date();
  const usable = coupons.filter((row) => couponStatus(row, now) === "usable");
  const others = coupons.filter((row) => couponStatus(row, now) !== "usable");

  return (
    <div className="pb-8">
      <div className="mx-4 mt-4 p-4 bg-[#00C896]/5 border border-[#00C896]/20 rounded-2xl">
        <p className="text-sm font-bold text-gray-800">쿠폰은 앱에서만 사용할 수 있어요</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          웹에서는 보유 쿠폰을 확인할 수 있고, 실제 적용은 모두의수선 앱 주문에서만 가능합니다.
        </p>
        <div className="mt-3">
          <AppDownloadLinks compact />
        </div>
        <Link
          href={APP_DOWNLOAD_PATH}
          className="block text-center text-xs text-[#00C896] font-semibold mt-2"
        >
          앱 설치 안내 보기
        </Link>
      </div>

      {isLoading ? (
        <div className="px-4 mt-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <p className="px-5 mt-5 text-sm font-bold text-gray-800">
            사용 가능 {usable.length}장
          </p>
          <div className="px-4 mt-2 space-y-3">
            {usable.length === 0 ? (
              <div className="py-10 text-center bg-white rounded-2xl border border-gray-100">
                <Ticket className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">사용 가능한 쿠폰이 없습니다</p>
              </div>
            ) : (
              usable.map((row) => (
                <CouponCard
                  key={row.id}
                  row={row}
                  status="usable"
                  copied={copiedCode === row.code}
                  onCopy={() => copyCode(row.code)}
                />
              ))
            )}
          </div>

          {others.length > 0 && (
            <>
              <p className="px-5 mt-6 text-sm font-bold text-gray-800">사용완료 · 만료</p>
              <div className="px-4 mt-2 space-y-3">
                {others.map((row) => (
                  <CouponCard
                    key={row.id}
                    row={row}
                    status={couponStatus(row, now)}
                    copied={false}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function CouponCard({
  row,
  status,
  copied,
  onCopy,
}: {
  row: WalletCoupon;
  status: CouponWalletStatus;
  copied: boolean;
  onCopy?: () => void;
}) {
  const dimmed = status !== "usable";
  return (
    <div
      className={`p-4 bg-white rounded-2xl border ${
        dimmed ? "border-gray-100 opacity-55" : "border-[#00C896]"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono font-bold text-gray-900">{row.code}</p>
        <span
          className={`text-xs font-semibold ${
            dimmed ? "text-gray-400" : "text-[#00C896]"
          }`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-800 mt-1.5">{discountLabel(row)}</p>
      {row.description && (
        <p className="text-xs text-gray-500 mt-1">{row.description}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-400">
          {row.valid_until
            ? `${formatDate(row.valid_until)}까지`
            : "기간 제한 없음"}
          {row.min_order_amount
            ? ` · ${formatPrice(row.min_order_amount)} 이상`
            : ""}
        </p>
        {status === "usable" && onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="text-xs font-semibold text-[#00C896]"
          >
            {copied ? "복사됨" : "코드 복사"}
          </button>
        )}
      </div>
      {status === "usable" && (
        <p className="text-xs text-gray-400 mt-2">앱에서 주문할 때 사용할 수 있어요</p>
      )}
    </div>
  );
}
