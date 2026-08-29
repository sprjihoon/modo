import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  const paths = [
    "/",
    "/guide",
    "/guide/price",
    "/guide/easy",
    "/guide/measure",
    "/faq",
    "/reviews",
    "/shop",
    "/download",
    "/announcements",
    "/terms",
    "/privacy-policy",
    "/refund-policy",
  ];

  return paths.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/guide") || path === "/shop" ? 0.8 : 0.5,
  }));
}
