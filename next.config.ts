import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Pin the workspace root to this project. Without this, Turbopack walks up
  // to c:\Users\jwate\Projects and fails to resolve `@import "tailwindcss"`.
  turbopack: {
    root: import.meta.dirname,
  },
  // The TypeScript type-check is the peak-memory phase of `next build` and
  // OOM-kills the production build on the small deploy VPS (build compiles
  // fine, then dies at "Running TypeScript ..."). It's enforced separately via
  // `tsc --noEmit`, so skip it here to keep the build light. (Next 16 no longer
  // runs ESLint during build, so there's no eslint key to set.)
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
