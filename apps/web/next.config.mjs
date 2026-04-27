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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.tosspayments.com https://js.tosspayments.com https://*.daumcdn.net https://va.vercel-scripts.com",
      "script-src-elem 'self' 'unsafe-inline' https://*.tosspayments.com https://js.tosspayments.com https://*.daumcdn.net https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://*.supabase.co https://imagedelivery.net https://customer.cloudflarestream.com https://*.daumcdn.net https://*.kakao.com https://k.kakaocdn.net",
      "media-src 'self' https://customer.cloudflarestream.com https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co https://*.tosspayments.com https://*.daumcdn.net https://*.daum.net https://*.kakao.com https://va.vercel-scripts.com wss://*.supabase.co",
      "frame-src 'self' https://*.tosspayments.com https://*.daum.net https://*.daumcdn.net https://*.kakao.com",
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
