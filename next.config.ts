import type { NextConfig } from "next";

const devOrigins = [
  "localhost",
  "127.0.0.1:5173",
  "blandness-drown-shrank.ngrok-free.dev",
  "snipping-unhidden-basin.ngrok-free.dev",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  experimental: {
    scrollRestoration: true,
  },
  async headers() {
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob: res.cloudinary.com;
      font-src 'self' data:;
      connect-src 'self' api.cloudinary.com ws: wss:;
      object-src 'none';
      base-uri 'self';
      frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
