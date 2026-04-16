"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface CompanyInfo {
  header_title?: string;
  company_name?: string;
  ceo_name?: string;
  business_number?: string;
  online_business_number?: string;
  address?: string;
  privacy_officer?: string;
  email?: string;
  phone?: string;
}

export function CompanyFooter() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [info, setInfo] = useState<CompanyInfo | null>(null);

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  async function loadCompanyInfo() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("company_info")
        .select()
        .limit(1)
        .maybeSingle();
      if (data) setInfo(data);
    } catch {
      // 기본값 사용
    }
  }

  const title =
    info?.header_title ??
    info?.company_name?.split("(")[0].trim() ??
    "모두의수선";

  const rows: { label: string; value: string }[] = [
    { label: "회사명", value: info?.company_name ?? "" },
    { label: "대표자", value: info?.ceo_name ?? "" },
    { label: "사업자등록번호", value: info?.business_number ?? "" },
    { label: "통신판매업신고번호", value: info?.online_business_number ?? "" },
    { label: "주소", value: info?.address ?? "" },
    { label: "개인정보관리책임자", value: info?.privacy_officer ?? "" },
    { label: "이메일", value: info?.email ?? "" },
    { label: "고객센터", value: info?.phone ?? "" },
  ];

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* 아코디언 헤더 */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="text-sm font-medium text-gray-800">{title}</span>
        <ChevronUp
          className="w-5 h-5 text-gray-500 transition-transform duration-200"
          style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(180deg)" }}
        />
      </button>

      {/* 아코디언 내용 */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex gap-2">
              <span className="text-xs text-gray-500 w-[120px] shrink-0">
                {label}
              </span>
              <span className="text-xs text-gray-800 flex-1">{value}</span>
            </div>
          ))}

          {/* 링크 */}
          <div className="flex gap-4 pt-2">
            <Link
              href="/terms"
              className="text-xs text-gray-600 underline underline-offset-2"
            >
              이용약관
            </Link>
            <Link
              href="/privacy-policy"
              className="text-xs text-gray-600 underline underline-offset-2"
            >
              개인정보처리방침
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
