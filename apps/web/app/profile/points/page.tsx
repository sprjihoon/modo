import { PageLayout } from "@/components/layout/PageLayout";
import { PointsClient } from "@/components/profile/PointsClient";

export default function PointsPage() {
  return (
    <PageLayout title="포인트" showBack showAppBanner={false}>
      <PointsClient />
    </PageLayout>
  );
}
