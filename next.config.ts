import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["morphhb", "better-sqlite3"],
};

export default nextConfig;
