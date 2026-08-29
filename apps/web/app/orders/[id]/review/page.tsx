import { PageLayout } from "@/components/layout/PageLayout";
import { ReviewWriteClient } from "@/components/reviews/ReviewWriteClient";

export default async function OrderReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageLayout title="리뷰 작성" showBack showAppBanner={false} showFooter={false}>
      <ReviewWriteClient orderId={id} />
    </PageLayout>
  );
}
