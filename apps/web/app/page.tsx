import { HomePageClient } from "@/components/home/HomePageClient";
import { PageLayout } from "@/components/layout/PageLayout";

export default function HomePage() {
  return (
    <PageLayout showAppBanner showIcons>
      <HomePageClient />
    </PageLayout>
  );
}
