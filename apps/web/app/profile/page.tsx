import { PageLayout } from "@/components/layout/PageLayout";
import { ProfilePageClient } from "@/components/profile/ProfilePageClient";

export default function ProfilePage() {
  return (
    <PageLayout title="마이페이지" showBack showAppBanner={false}>
      <ProfilePageClient />
    </PageLayout>
  );
}
