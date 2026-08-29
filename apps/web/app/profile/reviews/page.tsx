import { PageLayout } from "@/components/layout/PageLayout";
import { MyReviewsClient } from "@/components/reviews/MyReviewsClient";

export default function MyReviewsPage() {
  return (
    <PageLayout title="내 리뷰" showBack showAppBanner={false}>
      <MyReviewsClient />
    </PageLayout>
  );
}
