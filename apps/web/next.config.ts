import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@jarvis/database', '@jarvis/types'],
};

export default nextConfig;
