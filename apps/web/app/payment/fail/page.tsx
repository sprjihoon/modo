import { Suspense } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PaymentFailClient } from "@/components/payment/PaymentFailClient";

export default function PaymentFailPage() {
  return (
    <PageLayout title="결제 실패" showTabBar={false} showAppBanner={false}>
      <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">처리 중...</div>}>
        <PaymentFailClient />
      </Suspense>
    </PageLayout>
  );
}
