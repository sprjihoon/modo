import { InviteClient } from "@/components/profile/InviteClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function InvitePage() {
  return (
    <PageLayout title="친구 초대" showBack showTabBar={false} showAppBanner={false}>
      <InviteClient />
    </PageLayout>
  );
}
