import { route } from "@/server/http";
import { prisma } from "@/server/db";

/** GET /api/health — is the API up and can it reach the database? */
export const GET = route(async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true };
});
