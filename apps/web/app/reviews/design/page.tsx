import { PageLayout } from "@/components/layout/PageLayout";
import { ReviewDesignPreview } from "@/components/reviews/ReviewDesignPreview";

export default function ReviewDesignPreviewPage() {
  return (
    <PageLayout title="리뷰 디자인 확인" showBack showAppBanner={false} showFooter={false}>
      <ReviewDesignPreview />
    </PageLayout>
  );
}
