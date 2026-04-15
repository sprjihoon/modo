"use client";

import { useEffect, useState } from "react";
import { MapPin, Calendar, MessageSquare, ChevronDown, CheckCircle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { OrderDraft } from "./OrderNewClient";

interface Address {
  id: string;
  label?: string;
  recipient_name: string;
  address: string;
  address_detail?: string;
  is_default: boolean;
}

interface PickupStepProps {
  draft: OrderDraft;
  onNext: (data: Partial<OrderDraft>) => void;
  onBack: () => void;
}

export function PickupStep({ draft, onNext, onBack }: PickupStepProps) {
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [showAddressList, setShowAddressList] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const maxPickup = new Date();
  maxPickup.setDate(maxPickup.getDate() + 7);
  const maxDate = maxPickup.toISOString().split("T")[0];

  useEffect(() => {
    loadSavedAddresses();
  }, []);

  async function loadSavedAddresses() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRow } = await supabase
        .from("users").select("id").eq("auth_id", user.id).maybeSingle();
      if (!userRow) return;

      const { data } = await supabase
        .from("addresses")
        .select("id, label, recipient_name, address, address_detail, is_default")
        .eq("user_id", userRow.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setSavedAddresses(data);
        // 기본 배송지 자동 선택
        const defaultAddr = data.find((a) => a.is_default) ?? data[0];
        selectAddress(defaultAddr);
      }
    } catch { /* ignore */ }
  }

  function selectAddress(addr: Address) {
    setSelectedAddressId(addr.id);
    setAddress(addr.address);
    setAddressDetail(addr.address_detail ?? "");
    setShowAddressList(false);
  }

  function clearSelectedAddress() {
    setSelectedAddressId(null);
    setAddress("");
    setAddressDetail("");
  }

  async function handleSubmit() {
    if (!address.trim()) {
      alert("수거 주소를 입력해주세요.");
      return;
    }
    if (!pickupDate) {
      alert("수거 희망일을 선택해주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onNext({
        pickupAddress: address.trim(),
        pickupAddressDetail: addressDetail.trim(),
        pickupDate,
        memo,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">수거 정보를 입력해주세요</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          수선 항목 {draft.repairItems.length}개 선택됨
        </p>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* 수거 주소 */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2">
            <MapPin className="w-4 h-4 text-[#00C896]" />
            수거 주소 *
          </label>

          {/* 저장된 주소가 있으면 선택 UI 표시 */}
          {savedAddresses.length > 0 && (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setShowAddressList(!showAddressList)}
                className="w-full flex items-center justify-between px-4 py-3 border border-[#00C896]/40 bg-[#00C896]/5 rounded-xl text-sm text-[#00C896] font-semibold active:opacity-80"
              >
                <span>
                  {selectedAddressId
                    ? savedAddresses.find((a) => a.id === selectedAddressId)?.label
                      ?? savedAddresses.find((a) => a.id === selectedAddressId)?.recipient_name
                      ?? "저장된 주소"
                    : "저장된 주소에서 선택"}
                </span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", showAddressList && "rotate-180")} />
              </button>

              {showAddressList && (
                <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => selectAddress(addr)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors",
                        selectedAddressId === addr.id ? "bg-[#00C896]/5" : "bg-white"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {selectedAddressId === addr.id && (
                          <CheckCircle className="w-4 h-4 text-[#00C896] shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-bold text-gray-700">
                              {addr.label ?? addr.recipient_name}
                            </span>
                            {addr.is_default && (
                              <span className="text-[10px] text-[#00C896] bg-[#00C896]/10 px-1.5 rounded">기본</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{addr.address}</p>
                          {addr.address_detail && (
                            <p className="text-xs text-gray-400 truncate">{addr.address_detail}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                  <a
                    href="/profile/addresses/add"
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-3 bg-gray-50 text-xs text-gray-500 font-semibold active:bg-gray-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    새 배송지 추가
                  </a>
                </div>
              )}
            </div>
          )}

          {/* 직접 입력 */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder={savedAddresses.length > 0 ? "또는 직접 입력" : "주소를 입력해주세요"}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (selectedAddressId) clearSelectedAddress();
              }}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
            />
            <input
              type="text"
              placeholder="상세 주소 (동/호수 등)"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
            />
          </div>
        </div>

        {/* 수거 희망일 */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2">
            <Calendar className="w-4 h-4 text-[#00C896]" />
            수거 희망일 *
          </label>
          <input
            type="date"
            value={pickupDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => setPickupDate(e.target.value)}
            className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            희망일은 참고용이며, 실제 수거일은 우체국 일정에 따라 결정됩니다. 일요일은 수거 불가합니다.
          </p>
        </div>

        {/* 요청사항 */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2">
            <MessageSquare className="w-4 h-4 text-[#00C896]" />
            요청사항 (선택)
          </label>
          <textarea
            placeholder={"예) 공용현관 비번: #1234*\n부재 시 경비실에 맡겨주세요"}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors resize-none"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            공용현관 비번, 수거 방법 등을 입력하면 우체국 집배원에게 전달됩니다.
          </p>
        </div>

        {/* 신청 요약 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-bold text-gray-500 mb-2">신청 요약</p>
          <p className="text-sm text-gray-700">
            의류: <span className="font-semibold">{draft.clothingType}</span>
          </p>
          <p className="text-sm text-gray-700 mt-1">
            수선 항목:{" "}
            <span className="font-semibold">
              {draft.repairItems.map((i) => i.name).join(", ")}
            </span>
          </p>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
        <button type="button" onClick={onBack} className="btn-outline px-5 py-4">
          이전
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn-brand flex-1 py-4"
        >
          {isSubmitting ? "신청 중..." : "수거신청 완료"}
        </button>
      </div>
    </div>
  );
}
