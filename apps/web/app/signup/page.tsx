import { Suspense } from "react";
import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { SignupPageClient } from "@/components/auth/SignupPageClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "친구 초대 가입",
  description:
    "초대 코드로 가입하면 포인트가 적립됩니다. 문 앞 택배 수거부터 전문 수선, 집으로 배송까지.",
  path: "/signup",
});

export default function SignupPage() {
  return (
    <PageLayout showAppBanner={false}>
      <Suspense
        fallback={
          <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
        }
      >
        <SignupPageClient />
      </Suspense>
    </PageLayout>
  );
}