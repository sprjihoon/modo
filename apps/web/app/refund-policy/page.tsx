import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { LegalContentView } from "@/components/legal/LegalContentView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "결제 · 취소 · 환불 정책 | 모두의수선",
  description: "모두의수선의 결제, 주문 취소 및 환불 정책 안내",
};

export default function RefundPolicyPage() {
  return (
    <PageLayout title="결제 · 취소 · 환불 정책" showBack showAppBanner={false}>
      <LegalContentView
        contentKey="refund_policy"
        fallbackTitle="결제 · 취소 · 환불 정책"
      />
    </PageLayout>
  );
}
