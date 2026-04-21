import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { LegalContentView } from "@/components/legal/LegalContentView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 모두의수선",
  description: "모두의수선 개인정보처리방침 안내",
};

export default function PrivacyPolicyPage() {
  return (
    <PageLayout title="개인정보처리방침" showBack showAppBanner={false}>
      <LegalContentView
        contentKey="privacy_policy"
        fallbackTitle="개인정보처리방침"
      />
    </PageLayout>
  );
}
