import { PageLayout } from "@/components/layout/PageLayout";
import { TrackingClient } from "@/components/orders/TrackingClient";

interface Props {
  params: { id: string };
  searchParams: { tracking_no?: string };
}

export default function TrackingPage({ params, searchParams }: Props) {
  const trackingNo = searchParams.tracking_no ?? "";

  if (!trackingNo) {
    return (
      <PageLayout title="배송추적" showTabBar={false}>
        <div className="p-8 text-center text-sm text-gray-400">
          송장번호 정보가 없습니다.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="배송추적" showTabBar={false}>
      <TrackingClient orderId={params.id} trackingNo={trackingNo} />
    </PageLayout>
  );
}
