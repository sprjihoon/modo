import { OrderListClient } from "@/components/orders/OrderListClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function OrdersPage() {
  return (
    <PageLayout title="주문 내역" showBack showTabBar showAppBanner={false}>
      <OrderListClient />
    </PageLayout>
  );
}
