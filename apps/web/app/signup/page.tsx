import { SignupPageClient } from "@/components/auth/SignupPageClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function SignupPage() {
  return (
    <PageLayout
      title="회원가입"
      showBack
      showTabBar={false}
      showAppBanner={false}
      showIcons={false}
    >
      <SignupPageClient />
    </PageLayout>
  );
}
