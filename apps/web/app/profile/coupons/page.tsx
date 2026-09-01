import { PageLayout } from "@/components/layout/PageLayout";
import { CouponsClient } from "@/components/profile/CouponsClient";

export default function CouponsPage() {
  return (
    <PageLayout title="쿠폰함" showBack showAppBanner={false}>
      <CouponsClient />
    </PageLayout>
  );
}
