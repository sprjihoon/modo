import { PageLayout } from "@/components/layout/PageLayout";
import { NotificationsClient } from "@/components/notifications/NotificationsClient";

export default function NotificationsPage() {
  return (
    <PageLayout title="알림" showBack showAppBanner={false}>
      <NotificationsClient />
    </PageLayout>
  );
}