import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root holds another package-lock.json, so Next.js cannot infer
  // the project root on its own. Pin it to this folder.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
