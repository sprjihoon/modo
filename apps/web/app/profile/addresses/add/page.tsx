import { PageLayout } from "@/components/layout/PageLayout";
import { AddAddressClient } from "@/components/profile/AddAddressClient";

export const metadata = { title: "배송지 추가" };

export default function AddAddressPage() {
  return (
    <PageLayout title="배송지 추가" showTabBar={false} showBack>
      <AddAddressClient />
    </PageLayout>
  );
}
