import { OrderDetailClient } from "@/components/orders/OrderDetailClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageLayout
      title="주문 상세"
      showBack

      showAppBanner={false}
    >
      <OrderDetailClient orderId={id} />
    </PageLayout>
  );
}
