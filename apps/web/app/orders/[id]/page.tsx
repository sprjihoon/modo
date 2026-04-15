import { OrderDetailClient } from "@/components/orders/OrderDetailClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <PageLayout
      title="주문 상세"
      showBack
      showTabBar={false}
      showAppBanner={false}
    >
      <OrderDetailClient orderId={params.id} />
    </PageLayout>
  );
}
