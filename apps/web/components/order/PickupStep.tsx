"use client";

import { useEffect, useState } from "react";
import {
  MapPin, Calendar, MessageSquare, ChevronDown, CheckCircle,
  Plus, Info, Truck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { OrderDraft } from "./OrderNewClient";
import { AddressSearchButton } from "@/components/ui/AddressSearchButton";
import { isRemoteArea } from "@/lib/remote-area";

interface Address {
  id: string;
  label?: string;
  recipient_name: string;
  address: string;
  address_detail?: string;
  zipcode?: string;
  is_default: boolean;
}

interface PickupStepProps {
  draft: OrderDraft;
  onNext: (data: Partial<OrderDraft>) => void;
  onBack: () => void;
}

// 한국 법정공휴일 (토·일은 별도 처리)
const KR_HOLIDAYS = new Set([
  "2025-01-01", "2025-01-28", "2025-01-29", "2025-01-30",
  "2025-03-01", "2025-05-05", "2025-05-06", "2025-05-15",
  "2025-06-06", "2025-08-15", "2025-10-03", "2025-10-05",
  "2025-10-06", "2025-10-07", "2025-10-08", "2025-10-09", "2025-12-25",
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18",
  "2026-03-01", "2026-05-05", "2026-05-24", "2026-06-06",
  "2026-08-15", "2026-08-16", "2026-09-24", "2026-09-25", "2026-09-26",
  "2026-10-03", "2026-10-09", "2026-12-25",
]);

function isUnavailable(date: Date): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return true;
  return KR_HOLIDAYS.has(date.toISOString().split("T")[0]);
}

interface ShippingPromo {
  baseShippingFee: number;
  discountAmount: number;
  finalShippingFee: number;
  promotionName: string | null;
}

interface ShippingSettings {
  baseShippingFee: number;
  remoteAreaFee: number;
  returnShippingFee: number;
}

const FALLBACK_SHIPPING: ShippingSettings = {
  baseShippingFee: 7000,
  remoteAreaFee: 400,
  returnShippingFee: 7000,
};

export function PickupStep({ draft, onNext, onBack }: PickupStepProps) {
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [showAddressList, setShowAddressList] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [shippingPromo, setShippingPromo] = useState<ShippingPromo | null>(null);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings>(FALLBACK_SHIPPING);

  // 날짜 계산 (state 초기값에 사용)
  function getNextWeekday(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (isUnavailable(d)) d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }
  function getMaxDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return d.toISOString().split("T")[0];
  }

  const minDate = getNextWeekday();
  const maxDate = getMaxDate();

  // draft 에 저장된 값이 있으면 (장바구니 이어서 진행) 초기값으로 사용한다.
  const [address, setAddress] = useState(draft.pickupAddress ?? "");
  const [addressDetail, setAddressDetail] = useState(
    draft.pickupAddressDetail ?? ""
  );
  const [pickupZipcode, setPickupZipcode] = useState(draft.pickupZipcode ?? "");
  const [pickupDate, setPickupDate] = useState(draft.pickupDate ?? minDate);
  const [notes, setNotes] = useState(draft.notes ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 배송지 = 수거지 여부
  const initialSameAsPickup =
    !draft.deliveryAddress ||
    draft.deliveryAddress === draft.pickupAddress;
  const [sameAsPickup, setSameAsPickup] = useState(initialSameAsPickup);
  const [deliveryAddress, setDeliveryAddress] = useState(
    initialSameAsPickup ? "" : (draft.deliveryAddress ?? "")
  );
  const [deliveryAddressDetail, setDeliveryAddressDetail] = useState(
    initialSameAsPickup ? "" : (draft.deliveryAddressDetail ?? "")
  );
  const [deliveryZipcode, setDeliveryZipcode] = useState(
    initialSameAsPickup ? "" : (draft.deliveryZipcode ?? "")
  );

  // 필수 동의
  const [agreedToExtraCharge, setAgreedToExtraCharge] = useState(false);

  const disabledDates = Array.from({ length: 21 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d;
  }).filter(isUnavailable).map((d) => d.toISOString().split("T")[0]);

  const SHIPPING_FEE = shippingSettings.baseShippingFee;

  // 도서산간 여부 (수거지 기준) — 왕복 = 편도 단가 × 2.
  // 정책: 의류는 들어오고 반드시 나가야 하므로 모든 배송비는 왕복 기준.
  const remoteAreaFee = isRemoteArea(pickupZipcode, address)
    ? shippingSettings.remoteAreaFee * 2
    : 0;

  // items[] 기반 집계
  const allRepairItems = draft.items.flatMap((it) => it.repairItems);
  const totalRepairItemsCount = allRepairItems.length;
  const clothingCount = draft.items.length;
  const clothingTypesLabel =
    clothingCount === 0
      ? ""
      : clothingCount === 1
        ? draft.items[0].clothingType || "의류"
        : `${draft.items[0].clothingType || "의류"} 외 ${clothingCount - 1}벌`;

  // 예상 수선비 계산 (배송비 제외)
  const estimatedRepairPrice = allRepairItems.reduce(
    (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
    0
  );

  // 총 예상 금액 = 수선비 + 왕복배송비 + 도서산간추가비
  const estimatedPrice = estimatedRepairPrice + SHIPPING_FEE + remoteAreaFee;

  useEffect(() => {
    loadSavedAddresses();
    loadShippingPromo();
    loadShippingSettings();
  }, []);

  async function loadShippingSettings() {
    try {
      const res = await fetch("/api/shipping-settings");
      if (res.ok) {
        const data = (await res.json()) as ShippingSettings;
        setShippingSettings({
          baseShippingFee: data.baseShippingFee ?? FALLBACK_SHIPPING.baseShippingFee,
          remoteAreaFee: data.remoteAreaFee ?? FALLBACK_SHIPPING.remoteAreaFee,
          returnShippingFee: data.returnShippingFee ?? FALLBACK_SHIPPING.returnShippingFee,
        });
      }
    } catch { /* 폴백값 사용 */ }
  }

  async function loadShippingPromo() {
    try {
      const res = await fetch(`/api/shipping-promotion?repairAmount=${estimatedRepairPrice}`);
      if (res.ok) {
        const data = await res.json();
        setShippingPromo(data);
      }
    } catch { /* 오류 시 기본 배송비 표시 */ }
  }

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
        .select("id, label, recipient_name, address, address_detail, zipcode, is_default")
        .eq("user_id", userRow.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setSavedAddresses(data);
        // draft 에서 이미 주소가 복원된 경우 자동 선택을 건너뛴다.
        if (!draft.pickupAddress) {
          const defaultAddr = data.find((a) => a.is_default) ?? data[0];
          selectAddress(defaultAddr);
        }
      }
    } catch { /* ignore */ }
  }

  function selectAddress(addr: Address) {
    setSelectedAddressId(addr.id);
    setAddress(addr.address);
    setAddressDetail(addr.address_detail ?? "");
    setPickupZipcode(addr.zipcode ?? "");
    setShowAddressList(false);
  }

  function clearSelectedAddress() {
    setSelectedAddressId(null);
    setAddress("");
    setAddressDetail("");
    setPickupZipcode("");
  }

  async function handleSubmit() {
    if (!address.trim()) { alert("수거 주소를 입력해주세요."); return; }
    if (!pickupDate) { alert("수거 희망일을 선택해주세요."); return; }
    if (disabledDates.includes(pickupDate)) {
      alert("토·일요일 및 공휴일은 수거가 불가합니다. 다른 날짜를 선택해주세요."); return;
    }
    if (!sameAsPickup && !deliveryAddress.trim()) {
      alert("수선 후 배송받을 주소를 입력해주세요."); return;
    }
    if (!agreedToExtraCharge) {
      alert("추가 결제 안내에 동의해주세요."); return;
    }
    setIsSubmitting(true);
    try {
      await onNext({
        pickupAddress: address.trim(),
        pickupAddressDetail: addressDetail.trim(),
        pickupZipcode: pickupZipcode.trim(),
        pickupDate,
        notes,
        deliveryAddress: sameAsPickup ? address.trim() : deliveryAddress.trim(),
        deliveryAddressDetail: sameAsPickup ? addressDetail.trim() : deliveryAddressDetail.trim(),
        deliveryZipcode: sameAsPickup ? pickupZipcode.trim() : deliveryZipcode.trim(),
        agreedToExtraCharge: true,
        remoteAreaFee,
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
          의류 {clothingCount}벌 · 수선 항목 {totalRepairItemsCount}개
        </p>
      </div>

      <div className="px-4 py-5 space-y-6">

        {/* 예상 금액 */}
        <div className="bg-[#00C896]/5 border border-[#00C896]/20 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-[#00C896] mb-2">결제 예정 금액</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">수선비</span>
            <span className="text-gray-800 font-medium">{estimatedRepairPrice.toLocaleString()}원~</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">왕복배송비</span>
            <div className="text-right">
              {shippingPromo && shippingPromo.discountAmount > 0 ? (
                <>
                  <span className="line-through text-gray-400 text-xs mr-1">
                    {SHIPPING_FEE.toLocaleString()}원
                  </span>
                  <span className="text-[#00C896] font-bold">
                    {shippingPromo.finalShippingFee === 0
                      ? "무료"
                      : `${shippingPromo.finalShippingFee.toLocaleString()}원`}
                  </span>
                </>
              ) : (
                <span className="text-gray-800 font-medium">{SHIPPING_FEE.toLocaleString()}원</span>
              )}
            </div>
          </div>
          {shippingPromo && shippingPromo.discountAmount > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#00C896] font-semibold flex items-center gap-1">
                🎉 {shippingPromo.promotionName ?? "배송비 할인"}
              </span>
              <span className="text-[#00C896] font-semibold">
                -{shippingPromo.discountAmount.toLocaleString()}원
              </span>
            </div>
          )}
          {remoteAreaFee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-orange-600 font-medium flex items-center gap-1">
                🏝 도서산간 추가 배송비
              </span>
              <span className="text-orange-600 font-bold">+{remoteAreaFee.toLocaleString()}원</span>
            </div>
          )}
          <div className="border-t border-[#00C896]/20 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">합계</span>
              <span className="text-xl font-extrabold text-gray-900">
                {(estimatedRepairPrice + (shippingPromo?.finalShippingFee ?? SHIPPING_FEE) + remoteAreaFee).toLocaleString()}원~
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400">정확한 수선비는 의류 입고 후 확정됩니다.</p>
          {remoteAreaFee > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-1">
              <p className="text-xs text-orange-700 font-semibold">
                🏝 도서산간 지역 추가 배송비 안내
              </p>
              <p className="text-xs text-orange-600 mt-0.5">
                해당 주소는 우체국 지정 도서산간 지역으로, 왕복 배송비 {remoteAreaFee.toLocaleString()}원이 추가됩니다.
              </p>
            </div>
          )}
          <div className="mt-1 pt-2 border-t border-[#00C896]/15">
            <p className="text-xs text-[#00C896] font-semibold">
              💡 여러 벌 동시 접수 시 더 경제적입니다!
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              왕복배송비는 수량과 관계없이 1회 {SHIPPING_FEE.toLocaleString()}원으로 동일합니다.
            </p>
          </div>
        </div>

        {/* 수거 주소 */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2">
            <MapPin className="w-4 h-4 text-[#00C896]" />
            수거 주소 *
          </label>

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

          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={savedAddresses.length > 0 ? "또는 주소 검색" : "주소 검색 후 선택"}
                value={address}
                readOnly={!!address}
                onChange={(e) => { if (!e.target.value) { setAddress(""); clearSelectedAddress(); } }}
                className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors bg-gray-50 text-gray-700"
              />
              <AddressSearchButton
                onSelect={(zip, addr) => {
                  setAddress(addr);
                  setAddressDetail("");
                  setPickupZipcode(zip);
                  if (selectedAddressId) clearSelectedAddress();
                }}
                label="검색"
                className="px-4 py-3.5 bg-[#00C896] text-white text-sm font-bold rounded-xl active:opacity-80 whitespace-nowrap"
              />
            </div>
            <input
              type="text"
              placeholder="상세 주소 (동/호수 등)"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
            />
          </div>
        </div>

        {/* 수거지 = 배송지 체크박스 */}
        <div>
          <button
            type="button"
            onClick={() => setSameAsPickup(!sameAsPickup)}
            className="flex items-center gap-2 w-full text-left"
          >
            <div className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
              sameAsPickup ? "bg-[#00C896] border-[#00C896]" : "border-gray-300"
            )}>
              {sameAsPickup && <CheckCircle className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className="text-sm text-gray-700 font-medium">
              수선 수거지와 수선 후 배송받을 주소지가 동일합니다.
            </span>
          </button>

          {!sameAsPickup && (
            <div className="mt-3 space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2">
                <Truck className="w-4 h-4 text-[#00C896]" />
                수선 후 배송받을 주소 *
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="주소 검색 후 선택"
                  value={deliveryAddress}
                  readOnly={!!deliveryAddress}
                  onChange={(e) => { if (!e.target.value) setDeliveryAddress(""); }}
                  className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] bg-gray-50 text-gray-700"
                />
                <AddressSearchButton
                  onSelect={(zip, addr) => {
                    setDeliveryAddress(addr);
                    setDeliveryAddressDetail("");
                    setDeliveryZipcode(zip);
                  }}
                  label="검색"
                  className="px-4 py-3.5 bg-[#00C896] text-white text-sm font-bold rounded-xl active:opacity-80 whitespace-nowrap"
                />
              </div>
              <input
                type="text"
                placeholder="상세 주소"
                value={deliveryAddressDetail}
                onChange={(e) => setDeliveryAddressDetail(e.target.value)}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
              />
            </div>
          )}
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
            onChange={(e) => {
              const val = e.target.value;
              if (disabledDates.includes(val)) {
                alert("토·일요일 및 공휴일은 수거가 불가합니다. 다른 날짜를 선택해주세요.");
                return;
              }
              setPickupDate(val);
            }}
            className={cn(
              "w-full px-4 py-3.5 border rounded-xl text-sm outline-none transition-colors",
              pickupDate && disabledDates.includes(pickupDate)
                ? "border-red-300 focus:border-red-400"
                : "border-gray-200 focus:border-[#00C896]"
            )}
          />
          <p className="text-xs text-gray-400 mt-1.5">
            희망일은 참고용이며, 실제 수거일은 우체국 일정에 따라 결정됩니다.{" "}
            <span className="text-red-400 font-medium">토·일요일 및 공휴일은 수거 불가합니다.</span>
          </p>
        </div>

        {/* 배송 요청사항 */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2">
            <MessageSquare className="w-4 h-4 text-[#00C896]" />
            배송 요청사항 (선택)
          </label>
          <textarea
            placeholder={"예) 공용현관 비번: #1234*\n부재 시 경비실에 맡겨주세요"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors resize-none"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            공용현관 비번, 수거 방법 등을 입력하면 우체국 집배원에게 전달됩니다.
          </p>
        </div>

        {/* 고지사항 */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="w-4 h-4 text-gray-500 shrink-0" />
            <p className="text-xs font-bold text-gray-600">서비스 안내</p>
          </div>
          <p className="text-xs text-[#00C896] font-semibold">
            선불 서비스입니다. 수거 신청 시 예상 금액이 결제됩니다.
          </p>
          <ul className="space-y-1.5">
            {[
              "정확한 수선비는 의류 입고 후 확정됩니다.",
              "의류 상태에 따라 수선이 불가하거나 추가 비용이 발생할 수 있으며, 사전에 안내드립니다.",
              "수선 완료까지 약 5영업일이 소요됩니다.",
              "추가 수선 발견 시 고객 동의 후 진행됩니다.",
              "취소는 수거 전까지만 가능합니다.",
            ].map((txt, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500">
                <span className="mt-0.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                {txt}
              </li>
            ))}
          </ul>
        </div>

        {/* 필수 동의 체크박스 */}
        <button
          type="button"
          onClick={() => setAgreedToExtraCharge(!agreedToExtraCharge)}
          className={cn(
            "flex items-start gap-3 w-full text-left p-4 rounded-xl border-2 transition-colors",
            agreedToExtraCharge
              ? "border-[#00C896] bg-[#00C896]/5"
              : "border-gray-200 bg-white"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
            agreedToExtraCharge ? "bg-[#00C896] border-[#00C896]" : "border-gray-300"
          )}>
            {agreedToExtraCharge && <CheckCircle className="w-3.5 h-3.5 text-white" />}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            수선 신청 시, 입고 후{" "}
            <span className="font-bold text-red-500">추가 결제 요청이 있을 수 있음</span>을
            확인하였습니다. <span className="text-red-400">*필수</span>
          </p>
        </button>

        {/* 신청 요약 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-bold text-gray-500 mb-2">신청 요약</p>
          <p className="text-sm text-gray-700">
            의류:{" "}
            <span className="font-semibold">
              {clothingTypesLabel} ({clothingCount}벌)
            </span>
          </p>
          <p className="text-sm text-gray-700 mt-1">
            수선 항목:{" "}
            <span className="font-semibold">
              {allRepairItems.map((i) => i.name).join(", ")}
            </span>
          </p>
          <p className="text-sm text-gray-700 mt-1">
            예상 금액:{" "}
            <span className="font-bold text-[#00C896]">
              {estimatedPrice.toLocaleString()}원~
            </span>
            <span className="text-xs text-gray-400 ml-1">(배송비 {SHIPPING_FEE.toLocaleString()}원 포함)</span>
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
          disabled={isSubmitting || !agreedToExtraCharge}
          className={cn(
            "flex-1 py-4 rounded-xl text-sm font-bold transition-colors",
            agreedToExtraCharge
              ? "bg-[#00C896] text-white active:opacity-80"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          {isSubmitting ? "처리 중..." : "수거 정보 완료"}
        </button>
      </div>
    </div>
  );
}
