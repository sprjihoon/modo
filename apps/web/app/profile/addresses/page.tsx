import { PageLayout } from "@/components/layout/PageLayout";
import { AddressesClient } from "@/components/profile/AddressesClient";

export const metadata = { title: "배송지 설정" };

export default function AddressesPage() {
  return (
    <PageLayout title="배송지 설정" showTabBar={false} showBack>
      <AddressesClient />
    </PageLayout>
  );
}
