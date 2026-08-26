import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "수선 가격표",
  description:
    "온라인 수선 가격 안내. 바지·청바지 기장, 허리, 지퍼, 아우터 소매 등 의류 수선 요금.",
  path: "/guide/price",
});

export default function PriceGuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
