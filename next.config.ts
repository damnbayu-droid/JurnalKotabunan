import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node", "sharp"],
  // Static generation for /category/[category] (and other prerendered
  // pages) queries the DB directly during `next build`. This project's
  // Supabase connection string is pinned to connection_limit=1 (see
  // DATABASE_URL), so Next's default multi-worker static generation
  // (3 workers on a 4-core Vercel build machine, each hitting Prisma
  // independently) fights over that single connection and times out -
  // confirmed via a real failed Vercel build ("Timed out fetching a new
  // connection from the connection pool... connection limit: 1"). Forcing
  // a single build worker serializes those DB calls instead of racing them.
  experimental: {
    cpus: 1,
  },
  images: {
    // Custom breakpoint lists (replaces Next's defaults entirely, not a
    // merge). Confirmed via PageSpeed Insights (2026-09-02, mobile) that
    // the default lists were too coarse for this site's actual `sizes`
    // props (40/64/80/96/240px thumbnails, see article-card.tsx,
    // popular-news-carousel.tsx, page.tsx): on a 2x-3x DPR phone, a
    // sizes="240px" card jumped straight from the default imageSizes'
    // 384px ceiling to deviceSizes' 640px - a real image ~2.7x wider than
    // the box ever displays it at (confirmed against the site's actual
    // rendered HTML, not just the PSI report). imageSizes below fills that
    // gap for the small/medium thumbnail sizes actually in use;
    // deviceSizes keeps enough range for the ~800px hero image up to a 3x
    // DPR ultra-wide display.
    imageSizes: [16, 32, 40, 48, 64, 80, 96, 128, 160, 200, 240, 256, 320, 384],
    deviceSizes: [384, 480, 640, 750, 828, 1080, 1200, 1920, 2560, 3840],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image.pollinations.ai',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gemini.google.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fal.media',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.blob.core.windows.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ibb.co.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'loremflickr.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'loremflickr.co',
        pathname: '/**',
      },
      {
        // Supabase Storage - primary article/ad image host (see
        // src/lib/storage/upload-image.ts). Project-specific hostname, not
        // a wildcard, since NEXT_PUBLIC_SUPABASE_URL is a single fixed
        // project for this app.
        protocol: 'https',
        hostname: 'upmuvcahgmzuztdhdzap.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Vercel Blob - fallback storage host when Supabase Storage upload
        // fails (redundancy, see src/lib/storage/upload-image.ts).
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
