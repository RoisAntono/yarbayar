import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next does not pick a parent lockfile by mistake
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Tree-shake icon imports so we ship only the icons we actually use,
  // and do the same for date-fns (used in history + group detail).
  // This drops ~30-40KB on routes that touch lucide.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },

  // Production-only: strip console logs other than warn/error so dev
  // diagnostics don't ride along into the client bundle.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
};

export default nextConfig;
