import { PageLayout } from "@/components/layout/PageLayout";
import { AddressesClient } from "@/components/profile/AddressesClient";

export default function AddressesPage() {
  return (
    <PageLayout title="배송지 설정" showBack showAppBanner={false}>
      <AddressesClient />
    </PageLayout>
  );
}
