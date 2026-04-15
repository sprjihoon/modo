import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "모두의수선 - 비대면 의류 수선 서비스",
  description: "문 앞에 두고 맡기는 비대면 의류 수선 서비스. 집에서 편하게 수선하세요.",
  keywords: ["의류수선", "비대면수선", "옷수선", "수선집", "모두의수선"],
  openGraph: {
    title: "모두의수선",
    description: "문 앞에 두고 맡기는 비대면 의류 수선 서비스",
    type: "website",
    locale: "ko_KR",
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
        <Providers>
          {/* 데스크톱: 회색 배경 위 중앙 430px 컨테이너 */}
          <div className="min-h-screen bg-gray-100 flex justify-center">
            <div className="app-container w-full shadow-sm">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
