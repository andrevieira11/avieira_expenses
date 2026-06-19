import type { NextConfig } from "next";

/**
 * Derive the public host (e.g. "expenses.example.com") from NEXT_PUBLIC_APP_URL so
 * Server Actions invoked through the Caddy proxy pass the origin/CSRF check.
 * Falls back to localhost for dev. See CLAUDE.md "domain invariants" + infra design.
 */
function safeHost(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

const allowedOrigins = [
  safeHost(process.env.NEXT_PUBLIC_APP_URL),
  "localhost:3000",
].filter((v): v is string => Boolean(v));

const nextConfig: NextConfig = {
  // Minimal, production-ready Docker image (.next/standalone + server.js).
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
