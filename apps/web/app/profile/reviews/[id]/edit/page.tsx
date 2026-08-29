import { PageLayout } from "@/components/layout/PageLayout";
import { ReviewWriteClient } from "@/components/reviews/ReviewWriteClient";

export default async function EditMyReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageLayout title="리뷰 수정" showBack showAppBanner={false} showFooter={false}>
      <ReviewWriteClient reviewId={id} />
    </PageLayout>
  );
}
