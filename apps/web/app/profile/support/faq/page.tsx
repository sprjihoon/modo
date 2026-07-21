import { PageLayout } from "@/components/layout/PageLayout";
import { FaqClient } from "@/components/profile/FaqClient";

export default function FaqPage() {
  return (
    <PageLayout title="자주 묻는 질문" showBack showAppBanner={false}>
      <FaqClient />
    </PageLayout>
  );
}
