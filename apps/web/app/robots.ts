import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/cart",
          "/payment",
          "/profile",
          "/orders",
          "/shop/checkout",
          "/shop/complete",
          "/notifications",
          "/complete-profile",
          "/postcode",
          "/forgot-password",
        ],
      },
      {
        userAgent: "Yeti",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/cart",
          "/payment",
          "/profile",
          "/orders",
          "/shop/checkout",
          "/shop/complete",
          "/notifications",
          "/complete-profile",
          "/postcode",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
