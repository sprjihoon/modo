import type { Metadata } from "next";
import { HomePageClient } from "@/components/home/HomePageClient";
import { PageLayout } from "@/components/layout/PageLayout";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "모두의수선 | 온라인 수선 · 비대면 의류 수선",
    description:
      "온라인으로 옷 수선을 맡기세요. 문 앞 택배 수거부터 전문 수선, 집으로 배송까지. 바지 기장, 지퍼, 허리 수선.",
    path: "/",
  }),
  title: {
    absolute: "모두의수선 | 온라인 수선 · 비대면 의류 수선",
  },
};

export default function HomePage() {
  return (
    <PageLayout showAppBanner showIcons>
      <HomePageClient />
    </PageLayout>
  );
}
