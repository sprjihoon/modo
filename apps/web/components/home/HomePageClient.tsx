"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Receipt, BookOpen, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BannerSlider } from "./BannerSlider";
import { RecentOrderCard } from "./RecentOrderCard";
import { OrderStartDialog } from "./OrderStartDialog";

interface UserProfile {
  name?: string;
  point_balance?: number;
}

interface Order {
  id: string;
  status: string;
  extra_charge_status?: string;
  item_name?: string;
  total_price?: number;
  created_at?: string;
}

export function HomePageClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showOrderDialog, setShowOrderDialog] = useState(false);

  // 추가결제 대기 배너
  const pendingChargeOrder = orders.find(
    (o) => o.extra_charge_status === "PENDING_CUSTOMER"
  );

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoggedIn(true);

      const { data: userRow } = await supabase
        .from("users")
        .select("id, name, point_balance")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (userRow) {
        setProfile({ name: userRow.name, point_balance: userRow.point_balance });
      }

      // 주문 조회: 서버 API 사용 (클라이언트 RLS 이슈 우회)
      const ordersRes = await fetch("/api/orders");
      if (ordersRes.ok) {
        const json = await ordersRes.json();
        const allOrders: Order[] = json.orders ?? [];
        const activeOrders = allOrders
          .filter((o) => o.status !== "CANCELLED")
          .slice(0, 5);
        setOrders(activeOrders);
      }
    } catch {
      // 에러 무시
    } finally {
      setIsLoading(false);
    }
  }

  function handleOrderStart() {
    if (!isLoggedIn) {
      router.push("/login?redirectTo=/order/new");
      return;
    }
    setShowOrderDialog(true);
  }

  return (
    <>
      <div className="bg-white">
        {/* 추가결제 알림 배너 */}
        {pendingChargeOrder && (
          <Link
            href={`/orders/${pendingChargeOrder.id}`}
            className="flex items-center gap-3 mx-4 mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl active:opacity-80"
          >
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-800">
                추가결제가 필요합니다
              </p>
              <p className="text-xs text-orange-600 mt-0.5">
                확인하고 결제를 완료해 주세요
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-orange-400" />
          </Link>
        )}

        {/* 인사말 */}
        <div className="px-5 pt-4 pb-1">
          {isLoading ? (
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <div>
              <p className="text-xl font-bold text-gray-900 leading-snug">
                <span className="text-[#00C896]">
                  {isLoggedIn ? profile?.name || "고객" : "고객"}
                </span>
                님 반가워요! 👋
              </p>
              <p className="text-sm text-gray-500 mt-1">
                비대면 의류 수선 서비스입니다.
              </p>
            </div>
          )}
        </div>

        {/* 배너 슬라이더 */}
        <div className="mt-3">
          <BannerSlider
            hasOrders={orders.length > 0}
            onOrderStart={handleOrderStart}
          />
        </div>

        {/* 바로가기 버튼 (가격표 / 쉬운가이드) */}
        <div className="flex gap-3 px-4 mt-5">
          <Link
            href="/guide/price"
            className="flex-1 flex items-center justify-center gap-2 py-4 border border-gray-200 rounded-xl active:bg-gray-50"
          >
            <Receipt className="w-5 h-5 text-[#00C896]" />
            <span className="text-sm font-semibold text-gray-700">가격표</span>
          </Link>
          <Link
            href="/guide/easy"
            className="flex-1 flex items-center justify-center gap-2 py-4 border border-gray-200 rounded-xl active:bg-gray-50"
          >
            <BookOpen className="w-5 h-5 text-[#00C896]" />
            <span className="text-sm font-semibold text-gray-700">
              쉬운가이드
            </span>
          </Link>
        </div>

        {/* 내 주문 섹션 */}
        {isLoggedIn && !isLoading && orders.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between px-5 mb-3">
              <h2 className="text-base font-bold text-gray-900">내 주문</h2>
              <Link
                href="/orders"
                className="flex items-center gap-0.5 text-xs text-gray-400 active:opacity-60"
              >
                전체보기
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="px-4 space-y-3">
              <RecentOrderCard order={orders[0]} />
              {orders.length > 1 && (
                <Link
                  href="/orders"
                  className="block text-center py-3 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium active:bg-gray-50"
                >
                  전체 주문 보기
                </Link>
              )}
            </div>
          </div>
        )}

        {/* 비로그인 or 주문 없을 때 */}
        {!isLoading && (!isLoggedIn || orders.length === 0) && (
          <div className="mt-6 mx-4 p-5 bg-gray-50 rounded-2xl text-center">
            <p className="text-gray-500 text-sm">
              {isLoggedIn
                ? "아직 주문 내역이 없어요"
                : "로그인하고 수선을 시작해 보세요"}
            </p>
            {!isLoggedIn && (
              <Link
                href="/login"
                className="inline-block mt-3 text-sm font-semibold text-[#00C896] underline"
              >
                로그인하기
              </Link>
            )}
          </div>
        )}

        {/* 앱 다운로드 섹션 (데스크톱용) */}
        <div id="app-download-section" className="mt-8 mx-4 mb-6 p-6 bg-[#00C896]/5 border border-[#00C896]/20 rounded-2xl text-center">
          <p className="text-2xl mb-2">📱</p>
          <p className="text-sm font-bold text-gray-800 mb-1">
            모두의수선 앱으로 더 편리하게
          </p>
          <p className="text-xs text-gray-500 mb-4">
            알림, 실시간 수선 현황을 앱에서 확인하세요
          </p>
          <div className="flex gap-2 justify-center">
            {process.env.NEXT_PUBLIC_IOS_APP_URL && (
              <a
                href={process.env.NEXT_PUBLIC_IOS_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-gray-900 text-white px-4 py-2 rounded-lg font-medium"
              >
                🍎 App Store
              </a>
            )}
            {process.env.NEXT_PUBLIC_ANDROID_APP_URL && (
              <a
                href={process.env.NEXT_PUBLIC_ANDROID_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-gray-900 text-white px-4 py-2 rounded-lg font-medium"
              >
                🤖 Play Store
              </a>
            )}
            {!process.env.NEXT_PUBLIC_IOS_APP_URL &&
              !process.env.NEXT_PUBLIC_ANDROID_APP_URL && (
                <p className="text-xs text-gray-400">앱 출시 예정</p>
              )}
          </div>
        </div>
      </div>

      {/* 수거신청 FAB */}
      <button
        onClick={handleOrderStart}
        className="fixed bottom-20 right-1/2 translate-x-1/2 z-40 flex items-center gap-2 bg-[#00C896] text-white font-bold px-6 py-3.5 rounded-full shadow-lg shadow-[#00C896]/30 active:shadow-none active:bg-[#00A07B] transition-all"
        style={{ right: "unset", transform: "translateX(-50%)", left: "50%" }}
      >
        <Plus className="w-4 h-4" />
        {orders.length > 0 ? "수선신청 하기" : "첫 수선신청 하기"}
      </button>

      {/* 수거신청 다이얼로그 */}
      <OrderStartDialog
        open={showOrderDialog}
        onClose={() => setShowOrderDialog(false)}
      />
    </>
  );
}
