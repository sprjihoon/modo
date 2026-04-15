import { AccountClient } from "@/components/profile/AccountClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function AccountPage() {
  return (
    <PageLayout title="회원정보" showBack showTabBar={false} showAppBanner={false}>
      <AccountClient />
    </PageLayout>
  );
}
