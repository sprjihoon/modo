import { AnnouncementsClient } from "@/components/announcements/AnnouncementsClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function AnnouncementsPage() {
  return (
    <PageLayout
      title="공지사항"
      showBack
      showTabBar={false}
      showAppBanner={false}
    >
      <AnnouncementsClient />
    </PageLayout>
  );
}
