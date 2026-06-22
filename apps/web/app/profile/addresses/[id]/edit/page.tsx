import { PageLayout } from "@/components/layout/PageLayout";
import { AddressFormClient } from "@/components/profile/AddressFormClient";

export default async function EditAddressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageLayout title="배송지 수정" showBack showAppBanner={false}>
      <AddressFormClient addressId={id} />
    </PageLayout>
  );
}
