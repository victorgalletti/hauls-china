import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the native SQLite driver out of the bundler — it must load as a
  // regular Node module on the server.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;
