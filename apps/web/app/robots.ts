import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/utils";

/**
 * 공개 마케팅 페이지는 크롤링을 허용한다.
 * 장바구니·주문·프로필 등 HTML 페이지는 robots로 막지 않는다.
 * (사이트 헤더에 링크가 있어 Google이 발견하며, robots 차단 시
 *  Search Console에 "robots.txt에 의해 차단됨"으로 잡힌다.
 *  색인 제외는 각 페이지의 noindex 메타로 처리한다.)
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/", "/postcode"],
      },
      {
        userAgent: "Yeti",
        allow: "/",
        disallow: ["/api/", "/auth/", "/postcode"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
