import { NextResponse } from "next/server";

import { resolveGeo } from "@/lib/geo";
import { isPrismaConfigured, prisma } from "@/lib/prisma";
import { userFromRequest } from "@/lib/server-auth";
import { parseUserAgent } from "@/lib/user-agent";

/**
 * POST /api/track — regista um acesso.
 *
 * Chamado pelo `store` quando alguém entra ('login') ou quando retoma
 * uma sessão já aberta ('resume'). Nunca deita abaixo a sessão de
 * ninguém: qualquer problema aqui responde 200 e segue.
 */

export const dynamic = "force-dynamic";

/** Um 'resume' só conta como acesso novo passada meia hora. */
const RESUME_WINDOW_MS = 30 * 60 * 1000;

export async function POST(request: Request) {
  if (!isPrismaConfigured) {
    return NextResponse.json({ ok: false, reason: "sem DATABASE_URL" });
  }

  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json({ ok: false, reason: "sem sessão" }, { status: 401 });
  }

  let event = "login";
  try {
    const body = (await request.json()) as { event?: string };
    if (body?.event === "resume") event = "resume";
  } catch {
    /* sem corpo: fica 'login' */
  }

  try {
    if (event === "resume") {
      const last = await prisma.accessLog.findFirst({
        where: { userId: user.id },
        orderBy: { occurredAt: "desc" },
        select: { occurredAt: true },
      });

      if (last && Date.now() - last.occurredAt.getTime() < RESUME_WINDOW_MS) {
        return NextResponse.json({ ok: true, skipped: true });
      }
    }

    const ua = request.headers.get("user-agent");
    const device = parseUserAgent(ua);
    const geo = await resolveGeo(request.headers);

    await prisma.accessLog.create({
      data: {
        userId: user.id,
        event,
        ip: geo.ip,
        deviceType: device.deviceType,
        deviceModel: device.deviceModel,
        os: device.os,
        browser: device.browser,
        country: geo.country,
        countryCode: geo.countryCode,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone,
        userAgent: ua?.slice(0, 500) ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Falha ao registar o acesso:", error);
    return NextResponse.json({ ok: false, reason: "erro ao gravar" });
  }
}
