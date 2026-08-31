import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageLayout } from "@/components/layout/PageLayout";
import { MeasureDemoClient } from "@/components/orders/MeasureDemoClient";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata;

export default function MeasureDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <PageLayout title="치수 입력 목업" showBack showAppBanner={false}>
      <MeasureDemoClient />
    </PageLayout>
  );
}
