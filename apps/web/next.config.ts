import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The API is used by the website and the phone app; nothing else to configure yet.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // packages/shared is TypeScript source (no build step); Next compiles it with the app.
  transpilePackages: ["@baskyclub/shared"],
};

export default nextConfig;
