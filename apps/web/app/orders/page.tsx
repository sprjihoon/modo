import { OrderListClient } from "@/components/orders/OrderListClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function OrdersPage() {
  return (
    <PageLayout title="?? ??" showBack showAppBanner={false}>
      <OrderListClient />
    </PageLayout>
  );
}
