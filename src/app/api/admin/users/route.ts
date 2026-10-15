import { NextResponse } from "next/server";

import type { AdminAccess, AdminOverview, AdminUser } from "@/lib/admin";
import { isPrismaConfigured, prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";

/**
 * GET /api/admin/users — toda a gente com conta, para o painel admin.
 *
 * Lê `auth.users` (email, último login, confirmação) junto com o perfil
 * e o acesso mais recente. Só o Prisma chega a `auth.users`: o cliente
 * do navegador não tem como.
 */

export const dynamic = "force-dynamic";

function serializeAccess(access: {
  id: string;
  occurredAt: Date;
  event: string;
  ip: string | null;
  deviceType: string | null;
  deviceModel: string | null;
  os: string | null;
  browser: string | null;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
}): AdminAccess {
  return { ...access, occurredAt: access.occurredAt.toISOString() };
}

export async function GET(request: Request) {
  if (!isPrismaConfigured) {
    return NextResponse.json(
      { error: "Painel indisponível: falta a DATABASE_URL no servidor." },
      { status: 503 },
    );
  }

  const auth = await requireAdmin(request);
  if ("denied" in auth) {
    return NextResponse.json({ error: auth.denied.error }, { status: auth.denied.status });
  }

  try {
    const rows = await prisma.authUser.findMany({
      where: { deletedAt: null },
      orderBy: { lastSignInAt: { sort: "desc", nulls: "last" } },
      include: {
        profile: true,
        accessLogs: {
          orderBy: { occurredAt: "desc" },
          take: 1,
        },
        _count: { select: { accessLogs: true } },
      },
    });

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const users: AdminUser[] = rows.map((row) => {
      const last = row.accessLogs[0] ?? null;
      return {
        id: row.id,
        name: row.profile?.name || row.email?.split("@")[0] || "sem nome",
        email: row.email,
        gender: row.profile?.gender ?? "male",
        isAdmin: row.profile?.isAdmin ?? false,
        isActive:
          row.emailConfirmedAt !== null &&
          (row.bannedUntil === null || row.bannedUntil.getTime() < now),
        createdAt: row.createdAt?.toISOString() ?? null,
        lastSignInAt: row.lastSignInAt?.toISOString() ?? null,
        accessCount: row._count.accessLogs,
        lastAccess: last ? serializeAccess(last) : null,
      };
    });

    const overview: AdminOverview = {
      users,
      totals: {
        users: users.length,
        active: users.filter((u) => u.isActive).length,
        online24h: users.filter((u) => {
          const when = u.lastAccess?.occurredAt ?? u.lastSignInAt;
          return when ? now - new Date(when).getTime() < day : false;
        }).length,
        accesses: users.reduce((sum, u) => sum + u.accessCount, 0),
      },
    };

    return NextResponse.json(overview);
  } catch (error) {
    console.error("Falha ao carregar o painel admin:", error);
    return NextResponse.json(
      { error: "Falha ao ler a base de dados." },
      { status: 500 },
    );
  }
}
