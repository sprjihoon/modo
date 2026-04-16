import { ForgotPasswordClient } from "@/components/auth/ForgotPasswordClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function ForgotPasswordPage() {
  return (
    <PageLayout
      title="비밀번호 찾기"
      showBack
      showAppBanner={false}
      showIcons={false}
    >
      <ForgotPasswordClient />
    </PageLayout>
  );
}
