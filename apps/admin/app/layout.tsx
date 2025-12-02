import type { Metadata } from "next";
import { Inter, Nanum_Gothic } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });
const nanumGothic = Nanum_Gothic({ 
  weight: ["400", "700", "800"],
  subsets: ["latin"],
  variable: "--font-nanum-gothic",
});

export const metadata: Metadata = {
  title: "모두의수선 - 관리자",
  description: "모두의수선 운영자 및 관리자 콘솔",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.className} ${nanumGothic.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

