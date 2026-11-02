import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phones must always re-check the service worker, or app updates get stuck.
  async headers() {
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }]
  },
};

export default nextConfig;
