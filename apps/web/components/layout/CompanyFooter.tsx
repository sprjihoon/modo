"use client";

import { useEffect, useRef, useState } from "react";
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

interface CompanyFooterProps {
  /** payment: 결제 페이지 — 사업자 정보·약관 링크 항상 표시 (PG 심사용) */
  variant?: "accordion" | "payment";
}

export function CompanyFooter({ variant = "accordion" }: CompanyFooterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  useEffect(() => {
    if (!isExpanded) return;
    // 짧은 페이지에서 푸터가 화면 하단에 붙어 있으면 펼친 내용이
    // 뷰포트 밖으로 생겨 "빈 아코디언"처럼 보이므로 스크롤로 노출
    const id = requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(id);
  }, [isExpanded]);

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
    } finally {
      setLoaded(true);
    }
  }

  const title =
    info?.header_title ??
    info?.company_name?.split("(")[0].trim() ??
    "모두의수선";

  const policyLinks = (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
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
      <Link
        href="/refund-policy"
        className="text-xs text-gray-600 underline underline-offset-2"
      >
        결제 · 취소 · 환불 정책
      </Link>
    </div>
  );

  const rows: { label: string; value: string }[] = [
    { label: "회사명", value: info?.company_name ?? "" },
    { label: "대표자", value: info?.ceo_name ?? "" },
    { label: "사업자등록번호", value: info?.business_number ?? "" },
    { label: "통신판매업신고번호", value: info?.online_business_number ?? "" },
    { label: "주소", value: info?.address ?? "" },
    { label: "개인정보관리책임자", value: info?.privacy_officer ?? "" },
    { label: "이메일", value: info?.email ?? "" },
    { label: "고객센터", value: info?.phone ?? "" },
  ].filter((row) => row.value.trim().length > 0);

  if (variant === "payment") {
    return (
      <div className="px-4 py-3 bg-white text-xs text-gray-600 space-y-1.5">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        {rows.map(({ label, value }) => (
          <p key={label}>
            <span className="text-gray-500">{label}</span> {value}
          </p>
        ))}
        <div className="pt-1">{policyLinks}</div>
      </div>
    );
  }

  function handleToggle() {
    setIsExpanded((prev) => {
      const next = !prev;
      if (next) loadCompanyInfo();
      return next;
    });
  }

  return (
    <div className="border-t border-gray-200 bg-white">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="text-sm font-medium text-gray-800">{title}</span>
        <ChevronUp
          className="w-5 h-5 text-gray-500 transition-transform duration-200"
          style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(180deg)" }}
        />
      </button>

      {isExpanded && (
        <div ref={panelRef} className="px-4 pb-4 space-y-2">
          {!loaded && rows.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">사업자 정보를 불러오는 중...</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">사업자 정보를 불러오지 못했습니다.</p>
          ) : (
            rows.map(({ label, value }) => (
              <div key={label} className="flex gap-2">
                <span className="text-xs text-gray-500 w-[120px] shrink-0">
                  {label}
                </span>
                <span className="text-xs text-gray-800 flex-1">{value}</span>
              </div>
            ))
          )}
          <div className="pt-2">{policyLinks}</div>
        </div>
      )}
    </div>
  );
}
