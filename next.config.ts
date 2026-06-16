import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — silences the multi-lockfile warning.
  turbopack: { root: __dirname },
};

export default nextConfig;
