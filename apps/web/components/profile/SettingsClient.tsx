"use client";

import Link from "next/link";
import { FileText, Shield, CreditCard, ChevronRight, Info } from "lucide-react";

const APP_VERSION = "1.0.0";

interface SettingItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

function SettingRow({ icon, label, href, onClick }: SettingItem) {
  const content = (
    <div className="flex items-center gap-3 px-5 py-4 active:bg-gray-50">
      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium text-gray-800">{label}</span>
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </div>
  );

  if (href) {
    const isInternal = href.startsWith("/");
    if (isInternal) {
      return <Link href={href}>{content}</Link>;
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return (
    <button onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <p className="text-xs font-bold text-gray-400 px-5 py-2 bg-gray-50">{title}</p>
  );
}

export function SettingsClient() {
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 앱 정보 */}
      <div className="mb-2">
        <SectionTitle title="앱 정보" />
        <div className="bg-white divide-y divide-gray-50">
          <SettingRow
            icon={<FileText className="w-4 h-4" />}
            label="서비스 이용약관"
            href="https://modosuson.com/terms"
          />
          <SettingRow
            icon={<Shield className="w-4 h-4" />}
            label="개인정보 처리방침"
            href="https://modosuson.com/privacy"
          />
          <SettingRow
            icon={<CreditCard className="w-4 h-4" />}
            label="결제 및 환불 규정"
            href="/refund-policy"
          />
        </div>
      </div>

      {/* 앱 버전 */}
      <div className="mb-2">
        <SectionTitle title="버전 정보" />
        <div className="bg-white">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
              <Info className="w-4 h-4" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-800">앱 버전</span>
            <span className="text-sm text-gray-400">{APP_VERSION}</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-8 text-center">
        <p className="text-xs text-gray-300">모두의수선 | 수선의 모든 것</p>
        <p className="text-xs text-gray-200 mt-1">© 2024 모두의수선. All rights reserved.</p>
      </div>
    </div>
  );
}
