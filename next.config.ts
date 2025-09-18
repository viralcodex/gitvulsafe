import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Enable static image optimization
    unoptimized: false,
    // Add image formats for better compression
    formats: ["image/webp", "image/avif"],
    // Add domains if you're loading external images
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    loader: "default",
  },
};

export default nextConfig;
