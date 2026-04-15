"use client";

import { useEffect, useState } from "react";
import { Headphones, Clock, MessageCircle, Phone, HelpCircle, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const KAKAO_CHANNEL_ID = "_dLhAX";
const DEFAULT_PHONE = "070-8211-1500";

interface OperatingHours {
  weekday: string;
  lunch: string;
  weekend: string;
}

export function SupportClient() {
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [hours, setHours] = useState<OperatingHours>({
    weekday: "09:00 - 18:00",
    lunch: "12:00 - 13:00",
    weekend: "휴무",
  });

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  async function loadCompanyInfo() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("company_info")
        .select("key, value")
        .in("key", ["customer_service_phone", "operating_hours_weekday", "operating_hours_lunch", "operating_hours_weekend"]);

      if (data) {
        const map = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]));
        if (map.customer_service_phone) setPhone(map.customer_service_phone);
        setHours({
          weekday: map.operating_hours_weekday ?? "09:00 - 18:00",
          lunch: map.operating_hours_lunch ?? "12:00 - 13:00",
          weekend: map.operating_hours_weekend ?? "휴무",
        });
      }
    } catch {
      // 기본값 사용
    }
  }

  function openKakaoChat() {
    window.open(`https://pf.kakao.com/${KAKAO_CHANNEL_ID}/chat`, "_blank");
  }

  function makePhoneCall() {
    window.location.href = `tel:${phone.replace(/-/g, "")}`;
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 space-y-4">
      {/* 헤더 카드 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <div className="w-16 h-16 bg-[#00C896]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Headphones className="w-8 h-8 text-[#00C896]" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">고객센터</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          궁금하신 점이 있으시면 언제든지 문의해주세요
        </p>

        <div className="mt-5 space-y-3">
          {/* 카카오톡 문의 */}
          <button
            onClick={openKakaoChat}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-sm text-gray-900"
            style={{ backgroundColor: "#FEE500" }}
          >
            <MessageCircle className="w-5 h-5" />
            카카오톡 문의
          </button>

          {/* 전화 문의 */}
          <button
            onClick={makePhoneCall}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-[#00C896] text-[#00C896] font-semibold text-sm"
          >
            <Phone className="w-4 h-4" />
            전화 문의 ({phone})
          </button>
        </div>
      </div>

      {/* 운영시간 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-bold text-gray-700">운영시간</p>
        </div>
        <div className="space-y-2.5">
          <HoursRow label="평일" value={hours.weekday} />
          <HoursRow label="점심시간" value={hours.lunch} />
          <HoursRow label="주말 및 공휴일" value={hours.weekend} highlight />
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <button
          className="w-full flex items-center gap-3 px-5 py-4 active:bg-gray-50"
          onClick={() => {/* TODO: FAQ */}}
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-gray-800">자주 묻는 질문</p>
            <p className="text-xs text-gray-400 mt-0.5">궁금한 점을 빠르게 찾아보세요</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
      </div>
    </div>
  );
}

function HoursRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${highlight ? "text-red-400" : "text-gray-800"}`}>{value}</span>
    </div>
  );
}
