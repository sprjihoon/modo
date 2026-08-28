"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppDownloadLinks } from "@/components/home/AppDownloadLinks";

export function DownloadPageClient() {
  const joined = useSearchParams().get("joined") === "1";

  return (
    <div className="px-5 py-10 text-center">
      <p className="text-3xl mb-3">{joined ? "🎉" : "📱"}</p>
      <h1 className="text-lg font-bold text-gray-900">
        {joined ? "가입이 완료되었습니다" : "모두의수선 앱"}
      </h1>
      <p className="mt-2 text-sm text-gray-500 leading-relaxed">
        {joined ? (
          <>
            앱을 설치한 뒤 같은 계정으로 로그인하면
            <br />
            주문·알림을 바로 받을 수 있어요.
          </>
        ) : (
          <>
            문 앞에 두고 맡기는 비대면 의류 수선.
            <br />
            알림과 수선 현황을 앱에서 확인하세요.
          </>
        )}
      </p>
      <div className="mt-8 max-w-sm mx-auto">
        <AppDownloadLinks />
      </div>
      {joined && (
        <Link
          href="/"
          className="inline-block mt-6 text-sm font-semibold text-[#00C896] underline"
        >
          웹으로 계속하기
        </Link>
      )}
      <p className="mt-6 text-xs text-gray-400 leading-relaxed">
        아이폰·아이패드는 App Store,
        <br />
        안드로이드는 Google Play에서 설치하세요.
      </p>
    </div>
  );
}
