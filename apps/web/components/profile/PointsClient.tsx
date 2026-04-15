"use client";

import { useEffect, useState } from "react";
import { Coins, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils";

interface PointTransaction {
  id: string;
  amount: number;
  type: string;
  description?: string;
  created_at?: string;
}

export function PointsClient() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPoints();
  }, []);

  async function loadPoints() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRow } = await supabase
        .from("users")
        .select("id, point_balance")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (!userRow) return;
      setBalance(userRow.point_balance ?? 0);

      const { data } = await supabase
        .from("point_transactions")
        .select("id, amount, type, description, created_at")
        .eq("user_id", userRow.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setTransactions(data ?? []);
    } catch {
      // 에러 무시
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      {/* 포인트 잔액 */}
      <div className="mx-4 mt-4 p-5 bg-gradient-to-br from-[#00C896] to-[#00A07B] rounded-2xl text-white">
        <p className="text-sm font-medium opacity-80 mb-1">현재 포인트</p>
        <div className="flex items-center gap-2">
          <Coins className="w-6 h-6" />
          <p className="text-3xl font-extrabold">{balance.toLocaleString("ko-KR")}</p>
          <span className="text-sm">P</span>
        </div>
      </div>

      {/* 내역 */}
      <div className="mt-4">
        <p className="text-xs font-bold text-gray-400 px-5 py-2">적립/사용 내역</p>

        {isLoading ? (
          <div className="px-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">내역이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map((t) => {
              const isEarn = t.amount > 0;
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 px-5 py-4 bg-white"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isEarn ? "bg-[#00C896]/10" : "bg-red-50"
                    }`}
                  >
                    {isEarn ? (
                      <TrendingUp className="w-4 h-4 text-[#00C896]" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {t.description || (isEarn ? "포인트 적립" : "포인트 사용")}
                    </p>
                    {t.created_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(t.created_at)}
                      </p>
                    )}
                  </div>
                  <p
                    className={`text-sm font-bold ${
                      isEarn ? "text-[#00C896]" : "text-red-500"
                    }`}
                  >
                    {isEarn ? "+" : ""}
                    {t.amount.toLocaleString("ko-KR")}P
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
