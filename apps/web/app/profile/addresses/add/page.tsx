import { PageLayout } from "@/components/layout/PageLayout";
import { AddAddressClient } from "@/components/profile/AddAddressClient";

export default function AddAddressPage() {
  return (
    <PageLayout title="배송지 추가" showBack showAppBanner={false}>
      <AddAddressClient />
    </PageLayout>
  );
}
