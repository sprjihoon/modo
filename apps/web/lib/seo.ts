import type { Metadata } from "next";

export const SITE_NAME = "모두의수선";
export const SITE_URL = "https://modo.io.kr";

export const DEFAULT_TITLE = "모두의수선 | 온라인 수선 · 비대면 의류 수선";
export const DEFAULT_DESCRIPTION =
  "온라인으로 옷 수선을 맡기세요. 문 앞 택배 수거부터 전문 수선, 집으로 배송까지. 바지 기장, 지퍼, 허리 수선 등 비대면 의류 수선.";

/** 카톡·SNS 링크 미리보기. `public/og.png` (1200×630) */
export const OG_IMAGE_PATH = "/og.png";
export const OG_IMAGE = {
  url: OG_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: "모두의수선 — 문 앞에서 맡기는 비대면 의류 수선",
} as const;

export const DEFAULT_KEYWORDS = [
  "온라인수선",
  "온라인 수선",
  "비대면수선",
  "택배수선",
  "의류수선",
  "옷수선",
  "바지수선",
  "청바지 기장",
  "수선집",
  "모두의수선",
];

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
}): Metadata {
  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords ?? DEFAULT_KEYWORDS,
    alternates: { canonical: input.path },
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.path,
      locale: "ko_KR",
      siteName: SITE_NAME,
      type: "website",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [OG_IMAGE_PATH],
    },
  };
}

/** 로그인·결제·개인정보 페이지는 검색 결과에 올리지 않는다. */
export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};
