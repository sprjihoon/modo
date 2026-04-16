"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Scissors } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { formatPrice } from "@/lib/utils";

interface RepairType {
  id: string;
  name: string;
  price?: number;
  description?: string;
  category_id?: string;
}

export default function PriceGuidePage() {
  const router = useRouter();
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/repair-types");
      if (res.ok) {
        const json = await res.json();
        const types: RepairType[] = json.data ?? [];
        setRepairTypes(types);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function priceLabel(r: RepairType): string {
    if (r.price != null && r.price > 0) return formatPrice(r.price);
    return "가격 문의";
  }

  return (
    <PageLayout title="가격 안내" showBack showAppBanner={false}>
      {/* 안내 문구 */}
      <div className="mx-4 mt-4 p-4 bg-[#00C896]/5 border border-[#00C896]/20 rounded-2xl">
        <p className="text-xs text-[#00C896] font-semibold">참고 안내</p>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
          실제 수선 가격은 상태에 따라 달라질 수 있습니다. 정확한 금액은 문의해 주세요.
        </p>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : repairTypes.length === 0 ? (
          <div className="py-20 text-center">
            <Scissors className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">등록된 수선 항목이 없어요</p>
            <p className="text-xs text-gray-300 mt-1">잠시 후 다시 확인해 주세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {repairTypes.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] shrink-0 mt-1.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.name}</p>
                    {r.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-[#00C896] shrink-0 ml-2">
                  {priceLabel(r)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 수선 신청 CTA */}
      <div className="px-4 pb-8">
        <button
          onClick={() => router.push("/order/new")}
          className="w-full py-4 bg-[#00C896] text-white text-sm font-bold rounded-xl active:brightness-95 transition-all"
        >
          수선 신청 바로가기
        </button>
      </div>
    </PageLayout>
  );
}
