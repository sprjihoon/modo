import { PageLayout } from "@/components/layout/PageLayout";
import { TrackingClient } from "@/components/orders/TrackingClient";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tracking_no?: string }>;
}

export default async function TrackingPage({ params, searchParams }: Props) {
  const { id: orderId } = await params;
  const { tracking_no: trackingNo = "" } = await searchParams;

  if (!trackingNo) {
    return (
      <PageLayout title="배송추적" showBack>
        <div className="p-8 text-center text-sm text-gray-400">
          송장번호 정보가 없습니다.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="배송추적" showBack>
      <TrackingClient orderId={orderId} trackingNo={trackingNo} />
    </PageLayout>
  );
}
