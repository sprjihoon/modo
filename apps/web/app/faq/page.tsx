import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { FaqClient } from "@/components/profile/FaqClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "자주 묻는 질문 | 온라인 수선 모두의수선",
  description:
    "온라인 수선 이용 방법, 수거·배송비, 소요 기간, 취소·환불. 모두의수선 비대면 의류 수선 FAQ.",
  path: "/faq",
});

export default function PublicFaqPage() {
  return (
    <PageLayout title="자주 묻는 질문" showBack showAppBanner={false}>
      <FaqClient />
    </PageLayout>
  );
}
