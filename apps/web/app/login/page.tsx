import { Suspense } from "react";
import { LoginPageClient } from "@/components/auth/LoginPageClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function LoginPage() {
  return (
    <PageLayout
      title="로그인"
      showBack
      showAppBanner={false}
      showIcons={false}
    >
      <Suspense fallback={<div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>}>
        <LoginPageClient />
      </Suspense>
    </PageLayout>
  );
}
