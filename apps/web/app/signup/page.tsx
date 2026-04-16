import { PageLayout } from "@/components/layout/PageLayout";
import { SignupPageClient } from "@/components/auth/SignupPageClient";

export default function SignupPage() {
  return (
    <PageLayout showAppBanner={false}>
      <SignupPageClient />
    </PageLayout>
  );
}