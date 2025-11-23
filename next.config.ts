import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/evolab',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
