import { PageLayout } from "@/components/layout/PageLayout";
import { SettingsClient } from "@/components/profile/SettingsClient";

export default function SettingsPage() {
  return (
    <PageLayout title="설정" showBack showAppBanner={false}>
      <SettingsClient />
    </PageLayout>
  );
}
