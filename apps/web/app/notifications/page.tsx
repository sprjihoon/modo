import { NotificationsClient } from "@/components/notifications/NotificationsClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function NotificationsPage() {
  return (
    <PageLayout title="알림" showBack showTabBar showAppBanner={false}>
      <NotificationsClient />
    </PageLayout>
  );
}
