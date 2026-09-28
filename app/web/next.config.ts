import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Static export: the build writes plain HTML to out/ for S3 + CloudFront.
  output: 'export',
  // Produces out/services/index.html rather than out/services.html, so a
  // directory-style URL can resolve once the CloudFront rewrite lands.
  trailingSlash: true,
  // No runtime image optimizer exists in a static export; a build-time sharp
  // pipeline handles this in phase 2.
  images: { unoptimized: true },
  reactStrictMode: true,
}

export default nextConfig
