import { Suspense } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { CompleteProfileClient } from "@/components/auth/CompleteProfileClient";

export default function CompleteProfilePage() {
  return (
    <PageLayout
      title="추가 정보"
      showBack
      showAppBanner={false}
      showIcons={false}
    >
      <Suspense
        fallback={
          <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
        }
      >
        <CompleteProfileClient />
      </Suspense>
    </PageLayout>
  );
}
