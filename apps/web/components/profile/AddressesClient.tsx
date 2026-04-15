"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Star, Trash2, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Address {
  id: string;
  label?: string;
  recipient_name: string;
  recipient_phone: string;
  zipcode?: string;
  address: string;
  address_detail?: string;
  is_default: boolean;
}

export function AddressesClient() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => { loadAddresses(); }, []);

  async function getUserId(supabase: ReturnType<typeof createClient>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    return data?.id ?? null;
  }

  async function loadAddresses() {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const uid = await getUserId(supabase);
      if (!uid) { router.push("/login"); return; }
      setUserId(uid);

      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", uid)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      setAddresses(data ?? []);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  }

  async function setDefault(id: string) {
    if (!userId) return;
    setActionId(id);
    try {
      const supabase = createClient();
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
      await supabase.from("addresses").update({ is_default: true }).eq("id", id).eq("user_id", userId);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === id }))
      );
    } finally { setActionId(null); }
  }

  async function deleteAddress(id: string) {
    if (!confirm("배송지를 삭제하시겠습니까?")) return;
    if (!userId) return;
    setActionId(id);
    try {
      const supabase = createClient();
      await supabase.from("addresses").delete().eq("id", id).eq("user_id", userId);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } finally { setActionId(null); }
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 안내 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-b border-blue-100">
        <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="text-xs text-blue-700">
          수거지와 배송지를 미리 등록해두면 수거신청이 더 편리합니다
        </p>
      </div>

      {/* 주소 목록 */}
      <div className="p-4 space-y-3">
        {addresses.length === 0 ? (
          <div className="py-14 text-center">
            <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">등록된 배송지가 없습니다</p>
            <p className="text-xs text-gray-300 mt-1">아래 버튼을 눌러 배송지를 추가해주세요</p>
          </div>
        ) : (
          addresses.map((addr) => (
            <div
              key={addr.id}
              className={cn(
                "bg-white rounded-2xl border p-4 transition-all",
                addr.is_default ? "border-[#00C896] shadow-sm" : "border-gray-100"
              )}
            >
              {/* 상단: 라벨 + 기본배송지 뱃지 */}
              <div className="flex items-center gap-2 mb-2">
                {addr.is_default && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#00C896] bg-[#00C896]/10 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    기본 배송지
                  </span>
                )}
                {addr.label && (
                  <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {addr.label}
                  </span>
                )}
              </div>

              {/* 수령인 */}
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-sm font-bold text-gray-900">{addr.recipient_name}</p>
                <span className="text-gray-200">|</span>
                <p className="text-sm text-gray-500">{addr.recipient_phone}</p>
              </div>

              {/* 주소 */}
              <p className="text-sm text-gray-700">{addr.address}</p>
              {addr.address_detail && (
                <p className="text-sm text-gray-500 mt-0.5">{addr.address_detail}</p>
              )}
              {addr.zipcode && (
                <p className="text-xs text-gray-400 mt-0.5">[{addr.zipcode}]</p>
              )}

              {/* 액션 버튼 */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                {!addr.is_default && (
                  <button
                    onClick={() => setDefault(addr.id)}
                    disabled={actionId === addr.id}
                    className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 active:bg-gray-50 disabled:opacity-50"
                  >
                    <Star className="w-3 h-3" />
                    기본으로 설정
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => deleteAddress(addr.id)}
                  disabled={actionId === addr.id}
                  className="flex items-center gap-1 text-xs text-red-400 border border-red-100 rounded-lg px-3 py-1.5 active:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 배송지 추가 버튼 */}
      <div className="px-4 pb-6">
        <Link
          href="/profile/addresses/add"
          className="flex items-center justify-center gap-2 w-full py-4 bg-[#00C896] text-white text-sm font-bold rounded-2xl active:brightness-95"
        >
          <Plus className="w-4 h-4" />
          새 배송지 추가
        </Link>
      </div>
    </div>
  );
}
