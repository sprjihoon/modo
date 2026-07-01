// PG 심사 기간 중 임시 리다이렉트 — 심사 완료 후 아래 주석 해제하고 redirect 라인 삭제
// import { HomePageClient } from "@/components/home/HomePageClient";
// import { PageLayout } from "@/components/layout/PageLayout";
// export default function HomePage() {
//   return (
//     <PageLayout showAppBanner showIcons>
//       <HomePageClient />
//     </PageLayout>
//   );
// }

import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/shop");
}
