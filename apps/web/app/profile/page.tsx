import { PageLayout } from "@/components/layout/PageLayout";
import { ProfilePageClient } from "@/components/profile/ProfilePageClient";

export default function ProfilePage() {
  return (
    <PageLayout title="?????" showAppBanner={false}>
      <ProfilePageClient />
    </PageLayout>
  );
}
