"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, User, Phone, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AddAddressClient() {
  const router = useRouter();
  const [form, setForm] = useState({
    label: "",
    recipientName: "",
    recipientPhone: "",
    zipcode: "",
    address: "",
    addressDetail: "",
    isDefault: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.recipientName.trim()) { setError("수령인 이름을 입력해주세요"); return; }
    if (!form.address.trim()) { setError("주소를 입력해주세요"); return; }
    if (!form.recipientPhone.trim()) { setError("연락처를 입력해주세요"); return; }

    setError(null);
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: userRow } = await supabase
        .from("users").select("id").eq("auth_id", user.id).maybeSingle();
      if (!userRow) { setError("사용자 정보를 찾을 수 없습니다"); return; }

      // 기본 배송지로 설정 시 기존 기본 배송지 해제
      if (form.isDefault) {
        await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", userRow.id)
          .eq("is_default", true);
      }

      const { error: insertError } = await supabase.from("addresses").insert({
        user_id: userRow.id,
        label: form.label.trim() || null,
        recipient_name: form.recipientName.trim(),
        recipient_phone: form.recipientPhone.trim(),
        zipcode: form.zipcode.trim() || null,
        address: form.address.trim(),
        address_detail: form.addressDetail.trim() || null,
        is_default: form.isDefault,
      });

      if (insertError) throw insertError;
      router.back();
    } catch (e) {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 min-h-screen">
      <div className="p-4 space-y-4">

        {/* 배송지 별칭 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-2">
            <Home className="w-3.5 h-3.5" />
            배송지 별칭 (선택)
          </label>
          <input
            type="text"
            placeholder="예: 집, 회사, 부모님댁"
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
          />
        </div>

        {/* 수령인 정보 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
          <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            수령인 정보
          </p>
          <input
            type="text"
            placeholder="수령인 이름 *"
            value={form.recipientName}
            onChange={(e) => set("recipientName", e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
          />
          <input
            type="tel"
            placeholder="연락처 (예: 010-1234-5678) *"
            value={form.recipientPhone}
            onChange={(e) => set("recipientPhone", e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
          />
        </div>

        {/* 주소 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
          <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            주소
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="우편번호"
              value={form.zipcode}
              onChange={(e) => set("zipcode", e.target.value)}
              className="w-28 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
            />
          </div>
          <input
            type="text"
            placeholder="기본 주소 *"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
          />
          <input
            type="text"
            placeholder="상세 주소 (동/호수 등)"
            value={form.addressDetail}
            onChange={(e) => set("addressDetail", e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
          />
        </div>

        {/* 기본 배송지 설정 */}
        <label className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 cursor-pointer active:bg-gray-50">
          <div className="relative">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => set("isDefault", e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${form.isDefault ? "border-[#00C896] bg-[#00C896]" : "border-gray-200"}`}>
              {form.isDefault && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm font-medium text-gray-700">기본 배송지로 설정</span>
        </label>

        {/* 에러 */}
        {error && (
          <p className="text-sm text-red-500 text-center bg-red-50 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
      </div>

      {/* 저장 버튼 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3">
        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-4 bg-[#00C896] text-white text-sm font-bold rounded-xl disabled:opacity-60 active:brightness-95"
        >
          {isSaving ? "저장 중..." : "배송지 저장"}
        </button>
      </div>
    </form>
  );
}
