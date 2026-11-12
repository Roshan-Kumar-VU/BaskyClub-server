import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The API is used by the website and the phone app; nothing else to configure yet.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
