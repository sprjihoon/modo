"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart, Trash2, Package, Scissors, RefreshCw,
} from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  fetchCartItems,
  removeCartItem,
  CartDraftItem,
} from "@/lib/cart";

export function CartClient() {
  const router = useRouter();
  const [draftItems, setDraftItems] = useState<CartDraftItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCartItems().then((items) => {
      setDraftItems(items);
      setIsLoading(false);
    });

    // 같은 탭 내 cart 변경 이벤트 수신
    const onCartUpdate = () => {
      fetchCartItems().then(setDraftItems);
    };
    window.addEventListener("modu_cart_update", onCartUpdate);
    return () => window.removeEventListener("modu_cart_update", onCartUpdate);
  }, []);

  async function handleRemoveDraft(id: string) {
    setDraftItems((prev) => prev.filter((i) => i.id !== id));
    await removeCartItem(id);
  }

  function handleResumeDraft(item: CartDraftItem) {
    sessionStorage.setItem("cart_resume_draft", JSON.stringify(item.draft));
    router.push("/order/new?from=cart");
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (draftItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
          <ShoppingCart className="w-10 h-10 text-gray-300" />
        </div>
        <p className="text-base font-bold text-gray-700">장바구니가 비어 있습니다</p>
        <p className="text-sm text-gray-400 leading-relaxed">
          수거신청 중 &apos;담기&apos; 버튼을 눌러<br />항목을 저장해보세요
        </p>
        <Link
          href="/order/new"
          className="mt-2 px-6 py-3 bg-[#00C896] text-white text-sm font-bold rounded-xl active:brightness-95"
        >
          수거신청 시작하기
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-8">

      {/* ── 저장된 수거신청 항목 ── */}
      <section className="mt-5">
        <div className="px-4 mb-2 flex items-center gap-2">
          <Scissors className="w-4 h-4 text-[#00C896]" />
          <p className="text-sm font-bold text-gray-800">
            저장된 수거신청
            <span className="ml-1 text-xs font-normal text-gray-400">({draftItems.length}개)</span>
          </p>
        </div>

        <div className="space-y-3 px-4">
          {draftItems.map((item) => {
            const d = item.draft;
            const repairItems = d.repairItems ?? [];
            const repairTotal = repairItems.reduce(
              (s, r) => s + r.price * (r.quantity ?? 1),
              0
            );
            return (
              <div
                key={item.id}
                className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#00C896]/10 flex items-center justify-center shrink-0">
                      <Scissors className="w-5 h-5 text-[#00C896]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {d.clothingType
                          ? `${d.clothingType} · ${repairItems.map((r) => r.name).join(", ")}`
                          : repairItems.map((r) => r.name).join(", ")}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {repairItems.length}개 수선 항목
                        {repairTotal > 0 && (
                          <span className="ml-2 font-semibold text-[#00C896]">
                            수선비 {formatPrice(repairTotal)}~
                          </span>
                        )}
                      </p>
                      {d.pickupAddress && (
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                          📍 {d.pickupAddress}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-300 mt-1">
                        {formatDate(item.savedAt)} 저장
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveDraft(item.id)}
                      className="p-1.5 text-gray-300 active:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {repairItems.slice(0, 4).map((r, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-[#00C896]/8 text-[#00C896] px-2 py-0.5 rounded-full border border-[#00C896]/20"
                      >
                        {r.name}
                      </span>
                    ))}
                    {repairItems.length > 4 && (
                      <span className="text-[11px] text-gray-400 px-2 py-0.5">
                        +{repairItems.length - 4}개
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleResumeDraft(item)}
                  className="w-full py-3 bg-[#00C896]/8 border-t border-[#00C896]/15 text-[#00C896] text-sm font-bold flex items-center justify-center gap-1.5 active:bg-[#00C896]/15"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  이어서 수거신청
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 새 수거신청 ── */}
      <div className="px-4 mt-6">
        <Link
          href="/order/new"
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#00C896] text-white text-sm font-bold rounded-2xl active:brightness-95"
        >
          <Package className="w-4 h-4" />
          새 수거신청 하기
        </Link>
      </div>

      <div className="mx-4 mt-3 p-3.5 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-400 leading-relaxed">
          💡 장바구니는 모든 기기에서 동기화됩니다. &apos;이어서 수거신청&apos;을 눌러 중단된 곳부터 계속할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
