import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from local network IPs during development
  // This suppresses the "Blocked cross-origin request to Next.js dev resource" warning
  allowedDevOrigins: ['192.168.0.181', '192.168.1.0/24', '10.0.0.0/8', '172.16.0.0/12'],
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
};

export default nextConfig;