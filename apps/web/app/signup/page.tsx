import { Suspense } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { SignupPageClient } from "@/components/auth/SignupPageClient";

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