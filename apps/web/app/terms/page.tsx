import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { LegalContentView } from "@/components/legal/LegalContentView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "이용약관 | 모두의수선",
  description: "모두의수선 서비스 이용약관 안내",
};

export default function TermsPage() {
  return (
    <PageLayout title="이용약관" showBack showAppBanner={false}>
      <LegalContentView
        contentKey="terms_of_service"
        fallbackTitle="이용약관"
      />
    </PageLayout>
  );
}
