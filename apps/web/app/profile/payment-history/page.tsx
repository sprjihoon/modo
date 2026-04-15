import { PaymentHistoryClient } from "@/components/profile/PaymentHistoryClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function PaymentHistoryPage() {
  return (
    <PageLayout
      title="결제내역"
      showBack
      showTabBar={false}
      showAppBanner={false}
    >
      <PaymentHistoryClient />
    </PageLayout>
  );
}
