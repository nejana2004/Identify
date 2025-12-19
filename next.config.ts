import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during production builds for faster deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during production builds
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xqbfzdzwwgarwzmvrkwz.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
