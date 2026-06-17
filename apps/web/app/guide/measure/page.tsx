import { PageLayout } from "@/components/layout/PageLayout";
import { MeasureGuideClient } from "@/components/guide/MeasureGuideClient";

export default function MeasureGuidePage() {
  return (
    <PageLayout title="치수 재는 방법" showBack showAppBanner={false}>
      <MeasureGuideClient />
    </PageLayout>
  );
}
