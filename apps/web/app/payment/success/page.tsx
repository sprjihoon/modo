import { Suspense } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PaymentSuccessClient } from "@/components/payment/PaymentSuccessClient";

export default function PaymentSuccessPage() {
  return (
    <PageLayout title="결제 완료" showTabBar={false} showAppBanner={false}>
      <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">결제 확인 중...</div>}>
        <PaymentSuccessClient />
      </Suspense>
    </PageLayout>
  );
}
