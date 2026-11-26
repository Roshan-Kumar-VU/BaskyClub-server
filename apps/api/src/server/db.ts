import { PrismaClient } from "@prisma/client";

// One shared database client for the whole server.
// In development Next.js reloads files often; keeping the client on globalThis
// stops every reload from opening a new set of database connections.
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;
