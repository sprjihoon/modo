import { PageLayout } from "@/components/layout/PageLayout";
import { OrderNewClient } from "@/components/order/OrderNewClient";

export default function OrderNewPage() {
  return (
    <PageLayout title="수거신청" showAppBanner={false}>
      <OrderNewClient />
    </PageLayout>
  );
}
