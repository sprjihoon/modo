import { PageLayout } from "@/components/layout/PageLayout";
import { HomeReviewsPreview } from "@/components/reviews/HomeReviewsPreview";
import { ReviewWriteClient } from "@/components/reviews/ReviewWriteClient";

export default function ReviewDesignPreviewPage() {
  return (
    <PageLayout title="리뷰 디자인 확인" showBack showAppBanner={false} showFooter={false}>
      <p className="px-5 pt-4 text-xs text-gray-400">
        미리보기입니다. 실제 주문에는 등록되지 않습니다.
      </p>
      <HomeReviewsPreview preview />
      <div className="mt-2 border-t border-gray-100">
        <ReviewWriteClient orderId="preview" preview />
      </div>
    </PageLayout>
  );
}
