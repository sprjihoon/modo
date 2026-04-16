import { PageLayout } from "@/components/layout/PageLayout";
import { AccountClient } from "@/components/profile/AccountClient";

export default function AccountPage() {
  return (
    <PageLayout title="회원정보" showBack showAppBanner={false}>
      <AccountClient />
    </PageLayout>
  );
}
