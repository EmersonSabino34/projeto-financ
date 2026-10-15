import { NextResponse } from "next/server";

import { isAdmin, userFromRequest } from "@/lib/server-auth";

/**
 * GET /api/admin/me — "posso abrir o painel?".
 *
 * É o que decide se o atalho do painel aparece no cabeçalho. Responde
 * sempre 200: não ser admin é uma resposta, não um erro.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return NextResponse.json({ isAdmin: false });

  return NextResponse.json({ isAdmin: await isAdmin(user) });
}
