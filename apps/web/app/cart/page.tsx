import { PageLayout } from "@/components/layout/PageLayout";
import { CartClient } from "@/components/cart/CartClient";

export default function CartPage() {
  return (
    <PageLayout title="장바구니" showAppBanner={false}>
      <CartClient />
    </PageLayout>
  );
}
