import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata;

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
