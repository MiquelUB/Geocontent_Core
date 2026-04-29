/**
 * PXX — Prisma Client Singleton
 * Prevents multiple instances in development (hot reload)
 * Updated for Prisma 7 + Driver Adapter (Supabase/PostgreSQL)
 * Uses a Proxy for fully lazy initialization — safe during Next.js static build.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL || "";
  let finalConnectionString = connectionString;

  if (process.env.NODE_ENV === "development" && connectionString.includes('pooler.supabase.com')) {
    if (connectionString.includes(':5432')) {
      const newUrl = connectionString.replace(':5432', ':6543');
      finalConnectionString = newUrl.includes('?')
        ? (newUrl.includes('pgbouncer=true') ? newUrl : `${newUrl}&pgbouncer=true`)
        : `${newUrl}?pgbouncer=true`;
      console.log(" [Prisma] Dev: Switched to Transaction Pooling (6543)");
    }
  }

  const pool = new Pool({
    connectionString: finalConnectionString,
    max: process.env.NODE_ENV === 'development' ? 1 : 10,
    idleTimeoutMillis: 30000
  });
  const adapter = new PrismaPg(pool as any);

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  return client;
}

// Lazy singleton — NOT instantiated at import time. Safe for Next.js static build.
function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Proxy that defers all access to the real client until first use
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as any)[prop];
  },
});

export default prisma;
