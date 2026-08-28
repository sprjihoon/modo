import { DEFAULT_FAQ_ITEMS } from "@/lib/faq";
import { DEFAULT_DESCRIPTION, OG_IMAGE_PATH, SITE_NAME, SITE_URL } from "@/lib/seo";

export function SiteJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}${OG_IMAGE_PATH}`,
    image: `${SITE_URL}${OG_IMAGE_PATH}`,
    description: DEFAULT_DESCRIPTION,
    areaServed: "KR",
  };

  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "온라인 의류 수선",
    serviceType: "의류 수선",
    provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    areaServed: "KR",
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: DEFAULT_FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  );
}
