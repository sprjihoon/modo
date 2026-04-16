import { PageLayout } from "@/components/layout/PageLayout";
import { PaymentHistoryClient } from "@/components/profile/PaymentHistoryClient";

export default function PaymentHistoryPage() {
  return (
    <PageLayout title="결제 내역" showBack showAppBanner={false}>
      <PaymentHistoryClient />
    </PageLayout>
  );
}
