import { PageLayout } from "@/components/layout/PageLayout";
import { EasyGuideClient } from "@/components/guide/EasyGuideClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface EasyGuideStep {
  emoji: string;
  title: string;
  desc: string;
}

const FALLBACK_STEPS: EasyGuideStep[] = [
  { emoji: "📦", title: "수선 접수", desc: "앱에서 의류 종류와 수선 항목을 선택하고 수거 신청합니다." },
  { emoji: "🚚", title: "택배 수거", desc: "지정하신 날짜에 택배 기사님이 의류를 수거합니다." },
  { emoji: "✂️", title: "수선 작업", desc: "전문 수선사가 꼼꼼하게 수선합니다." },
  { emoji: "📬", title: "배송 완료", desc: "수선이 완료된 의류를 택배로 배송해드립니다." },
];

export default async function EasyGuidePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_contents")
    .select("content, metadata")
    .eq("key", "easy_guide")
    .maybeSingle<{ content: string | null; metadata: { steps?: EasyGuideStep[] } | null }>();

  const intro = data?.content?.trim() ?? "";
  const rawSteps = Array.isArray(data?.metadata?.steps) ? data!.metadata!.steps! : [];
  const steps: EasyGuideStep[] = rawSteps
    .filter((s) => s && (s.title || s.desc))
    .map((s) => ({
      emoji: (s.emoji ?? "").toString().trim() || "✨",
      title: (s.title ?? "").toString().trim(),
      desc: (s.desc ?? "").toString().trim(),
    }));

  const finalSteps = steps.length > 0 ? steps : FALLBACK_STEPS;

  return (
    <PageLayout title="이용 방법" showBack showAppBanner={false}>
      <EasyGuideClient intro={intro} steps={finalSteps} />
    </PageLayout>
  );
}
