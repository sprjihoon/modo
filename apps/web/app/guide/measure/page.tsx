import { PageLayout } from "@/components/layout/PageLayout";
import { MeasureGuideClient } from "@/components/guide/MeasureGuideClient";

export default async function MeasureGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; embed?: string }>;
}) {
  const params = await searchParams;
  const type = params.type?.trim() || null;
  const embed = params.embed === "1" || params.embed === "true";

  const client = (
    <MeasureGuideClient initialTypeId={type} lockType={!!type} />
  );

  if (embed) {
    return <div className="min-h-screen bg-white">{client}</div>;
  }

  return (
    <PageLayout title="치수 재는 방법" showBack showAppBanner={false}>
      {client}
    </PageLayout>
  );
}
