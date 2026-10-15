import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma — só do lado do servidor (route handlers e server
 * components). Liga-se ao Postgres do Supabase pela `DATABASE_URL`,
 * como dono das tabelas: passa ao lado do RLS, e por isso nunca deve
 * ser importado por um ficheiro "use client".
 *
 * O `globalThis` evita abrir uma ligação nova a cada hot-reload do
 * `next dev`, que esgotaria o pool.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** `false` enquanto não houver `DATABASE_URL` — ver `.env.example`. */
export const isPrismaConfigured = Boolean(process.env.DATABASE_URL);
