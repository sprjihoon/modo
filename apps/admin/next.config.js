/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // 프로덕션 빌드 시 ESLint 오류를 경고로 처리
    ignoreDuringBuilds: false,
  },
  typescript: {
    // 프로덕션 빌드 시 타입 체크 오류를 무시하지 않음
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

