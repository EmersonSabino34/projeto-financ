import { NextResponse } from "next/server";

import type { AdminAccess } from "@/lib/admin";
import { isPrismaConfigured, prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";

/**
 * GET /api/admin/accesses?user=<id>&limit=50 — o track completo de uma
 * pessoa: cada acesso com data, hora, aparelho, sistema e local.
 */

export const dynamic = "force-dynamic";

const MAX_LIMIT = 200;

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

  const url = new URL(request.url);
  const userId = url.searchParams.get("user");
  if (!userId) {
    return NextResponse.json({ error: "Falta o parâmetro `user`." }, { status: 400 });
  }

  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, MAX_LIMIT);

  try {
    const rows = await prisma.accessLog.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });

    const accesses: AdminAccess[] = rows.map((row) => ({
      id: row.id,
      occurredAt: row.occurredAt.toISOString(),
      event: row.event,
      ip: row.ip,
      deviceType: row.deviceType,
      deviceModel: row.deviceModel,
      os: row.os,
      browser: row.browser,
      country: row.country,
      countryCode: row.countryCode,
      region: row.region,
      city: row.city,
      timezone: row.timezone,
    }));

    return NextResponse.json({ accesses });
  } catch (error) {
    console.error("Falha ao carregar os acessos:", error);
    return NextResponse.json({ error: "Falha ao ler a base de dados." }, { status: 500 });
  }
}
