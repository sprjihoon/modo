import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/react";
import { OrderHowToSideWidget } from "@/components/order/OrderHowToSideWidget";
import { SiteJsonLd } from "@/components/seo/JsonLd";
import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, DEFAULT_TITLE, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://modo.io.kr"
  ),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "tYNJ1wZSBYzwmeFQ4vptyYS46Im89qQRt1TQ8dAClY4",
    other: {
      "naver-site-verification": "bd8054a4e44cf3918ae9606e38cfc0c54856efd1",
    },
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#00C896",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <SiteJsonLd />
        <Providers>
          {/* 데스크톱: 회색 배경 위 중앙 600px 컨테이너 */}
          <div className="min-h-screen bg-gray-100 flex justify-center">
            <div className="app-container w-full shadow-sm flex flex-col">
              {children}
            </div>
          </div>
          {/* PC: 오른쪽 여백 이용 방법 위젯 (메인·전 페이지) */}
          <OrderHowToSideWidget />
        </Providers>
        <Analytics mode="auto" />
        {process.env.NEXT_PUBLIC_CLARITY_ID && (
          <Script
            id="microsoft-clarity"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window,document,"clarity","script","${process.env.NEXT_PUBLIC_CLARITY_ID}");
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
