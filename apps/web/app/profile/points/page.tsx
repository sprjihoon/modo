import { PointsClient } from "@/components/profile/PointsClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function PointsPage() {
  return (
    <PageLayout
      title="포인트 내역"
      showBack
      showTabBar={false}
      showAppBanner={false}
    >
      <PointsClient />
    </PageLayout>
  );
}
