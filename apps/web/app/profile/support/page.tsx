import { PageLayout } from "@/components/layout/PageLayout";
import { SupportClient } from "@/components/profile/SupportClient";

export default function SupportPage() {
  return (
    <PageLayout title="고객센터" showBack showAppBanner={false}>
      <SupportClient />
    </PageLayout>
  );
}
