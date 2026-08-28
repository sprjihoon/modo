import { PageLayout } from "@/components/layout/PageLayout";
import { AnnouncementDetailClient } from "@/components/announcements/AnnouncementDetailClient";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageLayout title="공지사항" showBack showAppBanner={false}>
      <AnnouncementDetailClient id={id} />
    </PageLayout>
  );
}
