import { Suspense } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PaymentClient } from "@/components/payment/PaymentClient";

export default function PaymentPage() {
  return (
    <PageLayout title="결제" showTabBar={false} showAppBanner={false}>
      <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">로딩 중...</div>}>
        <PaymentClient />
      </Suspense>
    </PageLayout>
  );
}
