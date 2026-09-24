import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root holds another package-lock.json, so Next.js cannot infer
  // the project root on its own. Pin it to this folder.
  turbopack: {
    root: import.meta.dirname,
  },
  // The dev server is opened from the LAN address. Without this, Next.js
  // answers the browser's dev chunk requests with 403, the page never
  // hydrates, and the login form falls back to a native submit.
  allowedDevOrigins: ["192.168.1.5"],
};

export default nextConfig;
