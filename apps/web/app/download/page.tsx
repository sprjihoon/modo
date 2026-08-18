import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { AppDownloadLinks } from "@/components/home/AppDownloadLinks";

export const metadata: Metadata = {
  title: "앱 다운로드 | 모두의수선",
  description:
    "모두의수선 앱을 설치하세요. 아이폰은 App Store, 안드로이드는 Google Play에서 받을 수 있습니다.",
  alternates: {
    canonical: "/download",
  },
};

export default function DownloadPage() {
  return (
    <PageLayout title="앱 다운로드" showBack showAppBanner={false}>
      <div className="px-5 py-10 text-center">
        <p className="text-3xl mb-3">📱</p>
        <h1 className="text-lg font-bold text-gray-900">모두의수선 앱</h1>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          문 앞에 두고 맡기는 비대면 의류 수선.
          <br />
          알림과 수선 현황을 앱에서 확인하세요.
        </p>
        <div className="mt-8 max-w-sm mx-auto">
          <AppDownloadLinks />
        </div>
        <p className="mt-6 text-xs text-gray-400 leading-relaxed">
          아이폰·아이패드는 App Store,
          <br />
          안드로이드는 Google Play에서 설치하세요.
        </p>
      </div>
    </PageLayout>
  );
}
