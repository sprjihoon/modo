import { OrderNewClient } from "@/components/order/OrderNewClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function OrderNewPage() {
  return (
    <PageLayout
      title="수거신청"
      showBack
      showTabBar={false}
      showAppBanner={false}
      showIcons={false}
    >
      <OrderNewClient />
    </PageLayout>
  );
}
