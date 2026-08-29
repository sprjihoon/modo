import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { ReviewsListClient } from "@/components/reviews/ReviewsListClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "수선 리뷰 | 모두의수선",
  description: "모두의수선 고객 리뷰. 별점과 포토리뷰로 수선 결과를 확인하세요.",
  path: "/reviews",
});

export default function ReviewsPage() {
  return (
    <PageLayout title="리뷰" showBack showAppBanner={false}>
      <ReviewsListClient />
    </PageLayout>
  );
}
