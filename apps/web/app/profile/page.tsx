import { ProfilePageClient } from "@/components/profile/ProfilePageClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function ProfilePage() {
  return (
    <PageLayout title="마이페이지" showTabBar showAppBanner={false}>
      <ProfilePageClient />
    </PageLayout>
  );
}
