import { SettingsClient } from "@/components/profile/SettingsClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function SettingsPage() {
  return (
    <PageLayout title="설정" showBack showTabBar={false} showAppBanner={false}>
      <SettingsClient />
    </PageLayout>
  );
}
