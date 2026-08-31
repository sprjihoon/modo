const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // PortOne V2 SDK CDN + KCP/PG 결제창 스크립트
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.portone.io https://*.portone.io https://*.kcp.co.kr https://*.inicis.com",
      "script-src-elem 'self' 'unsafe-inline' https://cdn.portone.io https://*.portone.io https://*.kcp.co.kr https://*.inicis.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://*.supabase.co https://imagedelivery.net https://customer.cloudflarestream.com https://*.kcp.co.kr https://*.portone.io",
      "media-src 'self' https://customer.cloudflarestream.com https://*.supabase.co",
      // PortOne API + KCP + 간편결제
      // PortOne 내부 서비스는 구 도메인(iamport.co)도 사용
      "connect-src 'self' https://*.supabase.co https://rzrwediccbamxluegnex.supabase.co wss://*.supabase.co https://api.portone.io https://*.portone.io https://*.iamport.co https://*.kcp.co.kr",
      // 결제창 iframe: PortOne + KCP
      "frame-src 'self' https://*.portone.io https://checkout.portone.io https://*.iamport.co https://*.kcp.co.kr https://*.kakaopay.com https://nid.naver.com",
      "font-src 'self' data:",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // 전역 헤더와 겹치면 브라우저가 allowlist를 교집합으로 합쳐 카메라가 막힌다.
        // camera=(self) — 괄호 없는 camera=self 는 잘못된 문법이라 Chrome이 차단한다.
        source: '/ops/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/((?!ops/).*)',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'cloudflarestream.com',
      },
    ],
  },
};

module.exports = nextConfig;
