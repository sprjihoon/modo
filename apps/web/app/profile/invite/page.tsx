import { PageLayout } from "@/components/layout/PageLayout";
import { InviteClient } from "@/components/profile/InviteClient";

export default function InvitePage() {
  return (
    <PageLayout title="친구 초대" showBack showAppBanner={false}>
      <InviteClient />
    </PageLayout>
  );
}