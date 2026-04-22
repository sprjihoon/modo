import { Suspense } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { OrderNewClient } from "@/components/order/OrderNewClient";

export default function OrderNewPage() {
  return (
    <PageLayout title="수거신청" showBack showAppBanner={false}>
      <Suspense fallback={<div className="p-4 space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse"/>)}</div>}>
        <OrderNewClient />
      </Suspense>
    </PageLayout>
  );
}
