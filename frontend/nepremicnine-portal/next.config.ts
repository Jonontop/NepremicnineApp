import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'slike.nepremicnine.si21.com' },
      { protocol: 'https', hostname: 'arvio-propertyhub-prod.b-cdn.net' },
    ],
  },
};

export default nextConfig;
