import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageLayout } from "@/components/layout/PageLayout";
import { RepairPhotoDemoClient } from "@/components/orders/RepairPhotoDemoClient";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata;

export default function RepairPhotoDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <PageLayout title="수선 전·후 사진" showBack showAppBanner={false}>
      <RepairPhotoDemoClient />
    </PageLayout>
  );
}
