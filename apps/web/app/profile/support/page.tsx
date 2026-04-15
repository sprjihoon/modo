import { SupportClient } from "@/components/profile/SupportClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function SupportPage() {
  return (
    <PageLayout title="고객센터" showBack showTabBar={false} showAppBanner={false}>
      <SupportClient />
    </PageLayout>
  );
}
