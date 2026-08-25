import type { Metadata } from "next";

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
