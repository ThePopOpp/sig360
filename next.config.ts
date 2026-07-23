import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Pin the workspace root to this project. Without this, Turbopack walks up
  // to c:\Users\jwate\Projects and fails to resolve `@import "tailwindcss"`.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
