import { PageLayout } from "@/components/layout/PageLayout";
import { InviteClient } from "@/components/profile/InviteClient";

export default function InvitePage() {
  return (
    <PageLayout title="移쒓뎄 珥덈?" showBack showAppBanner={false}>
      <InviteClient />
    </PageLayout>
  );
}