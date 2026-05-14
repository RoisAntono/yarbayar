import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next does not pick a parent lockfile by mistake
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
