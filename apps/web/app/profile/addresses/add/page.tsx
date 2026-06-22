import { PageLayout } from "@/components/layout/PageLayout";
import { AddressFormClient } from "@/components/profile/AddressFormClient";

export default function AddAddressPage() {
  return (
    <PageLayout title="배송지 추가" showBack showAppBanner={false}>
      <AddressFormClient />
    </PageLayout>
  );
}
