import type { NextConfig } from "next";

// The API (apps/api). Read when the site is built/started: set API_URL in .env or the host's settings.
const apiUrl = (process.env.API_URL ?? "http://localhost:3000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // packages/shared is TypeScript source (no build step); Next compiles it with the site.
  transpilePackages: ["@baskyclub/shared"],
  // The browser calls this site's own /api/... and the site forwards it to the API:
  // same origin for the browser, so no CORS, and cookies stay on this domain.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
