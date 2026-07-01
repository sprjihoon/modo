import { withSentryConfig } from "@sentry/nextjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // PortOne V2 SDK CDN + KCP/PG 결제창 스크립트
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.portone.io https://*.portone.io https://*.kcp.co.kr https://*.inicis.com https://*.daumcdn.net https://va.vercel-scripts.com",
      "script-src-elem 'self' 'unsafe-inline' https://cdn.portone.io https://*.portone.io https://*.kcp.co.kr https://*.inicis.com https://*.daumcdn.net https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://*.supabase.co https://imagedelivery.net https://customer.cloudflarestream.com https://*.daumcdn.net https://*.kakao.com https://k.kakaocdn.net https://*.kcp.co.kr https://*.portone.io",
      "media-src 'self' https://customer.cloudflarestream.com https://*.supabase.co",
      // PortOne API + KCP + 카카오/네이버 간편결제
      "connect-src 'self' https://*.supabase.co https://*.portone.io https://api.portone.io https://*.kcp.co.kr https://*.daumcdn.net https://*.daum.net https://*.kakao.com https://va.vercel-scripts.com wss://*.supabase.co",
      // 결제창 iframe: PortOne + KCP + 카카오/네이버페이
      "frame-src 'self' https://*.portone.io https://checkout.portone.io https://*.kcp.co.kr https://*.daum.net https://*.daumcdn.net https://*.kakao.com https://nid.naver.com https://*.kakaopay.com",
      "font-src 'self' data:",
      "worker-src blob: 'self'",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 상위 디렉토리(`%USERPROFILE%/Documents/package-lock.json`)에서
  // lockfile 이 잘못 탐지되어 워크스페이스 루트가 잘못 추론되는 문제 방지.
  outputFileTracingRoot: __dirname,
  async redirects() {
  /** 레거시 고객 도메인 → 메인 도메인 (OAuth 콜백·공유 링크 일관성) */
    const legacyHosts = [
      'www.modo.io.kr',
      'modo.mom',
      'www.modo.mom',
      'modorepair.com',
      'www.modorepair.com',
    ];
    return legacyHosts.map((host) => ({
      source: '/:path*',
      has: [{ type: 'host', value: host }],
      destination: 'https://modo.io.kr/:path*',
      permanent: true,
    }));
  },
  async headers() {
    return [
      {
        // /postcode 는 우리 도메인 내 iframe으로 사용되므로 X-Frame-Options 제외
        source: '/postcode',
        headers: securityHeaders.filter((h) => h.key !== 'X-Frame-Options'),
      },
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "customer.cloudflarestream.com",
      },
      {
        protocol: "https",
        hostname: "imagedelivery.net",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  webpack: {
    // 신규 권장 위치 — disableLogger / automaticVercelMonitors deprecation 대응.
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
});
