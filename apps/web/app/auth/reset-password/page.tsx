import { ResetPasswordClient } from "@/components/auth/ResetPasswordClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function ResetPasswordPage() {
  return (
    <PageLayout
      title="비밀번호 재설정"
      showBack={false}
      showTabBar={false}
      showAppBanner={false}
      showIcons={false}
    >
      <ResetPasswordClient />
    </PageLayout>
  );
}
