import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: false,
    formats: ["image/webp", "image/avif"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    loader: "default",
  },
  
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'd3',
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
    turbopackFileSystemCacheForDev: true, // Enable filesystem cache in development
    turbopackClientSideNestedAsyncChunking: true, // Enable nested async chunking on client side
    turbopackFileSystemCacheForBuild: true, // Enable filesystem cache during build
    optimizeCss: true, // Enable CSS optimization
    scrollRestoration: true, // Enable scroll restoration
    cssChunking: true, // Enable CSS chunking
    inlineCss: true, // Enable CSS inlining
    turbopackRemoveUnusedExports: true, // Enable removal of unused exports
    turbopackRemoveUnusedImports: true, // Enable removal of unused imports
  },
};

export default nextConfig;
