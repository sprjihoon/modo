import { Suspense } from "react";
import type { Metadata } from "next";
import { DownloadPageClient } from "@/components/home/DownloadPageClient";
import { PageLayout } from "@/components/layout/PageLayout";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "앱 다운로드",
  description:
    "모두의수선 앱을 설치하세요. 아이폰은 App Store, 안드로이드는 Google Play에서 받을 수 있습니다.",
  path: "/download",
});

export default function DownloadPage() {
  return (
    <PageLayout title="앱 다운로드" showBack showAppBanner={false}>
      <Suspense
        fallback={
          <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
        }
      >
        <DownloadPageClient />
      </Suspense>
    </PageLayout>
  );
}
