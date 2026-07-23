import { MeasureGuideClient } from "@/components/guide/MeasureGuideClient";

/**
 * Flutter 앱 치수 입력 화면용 임베드 가이드.
 * 앱바/레이아웃 없이 MeasureGuideClient만 렌더링한다.
 */
export default async function MeasureGuideEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const type = params.type?.trim() || null;

  return (
    <div className="min-h-screen bg-white">
      <MeasureGuideClient initialTypeId={type} lockType={!!type} />
    </div>
  );
}
