import { createClient } from "@supabase/supabase-js";

import { prisma } from "./prisma";

/**
 * Quem está do outro lado de um pedido à API.
 *
 * O navegador manda o access token do Supabase no `Authorization`, e é
 * o próprio Supabase que o valida (chave anon basta — não é preciso a
 * service role). Só depois disso é que o Prisma toca na base de dados.
 */

export type SessionUser = {
  id: string;
  email: string | null;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/** Devolve o utilizador da sessão, ou `null` se o token faltar/não valer. */
export async function userFromRequest(request: Request): Promise<SessionUser | null> {
  if (!url || !anonKey) return null;

  const token = bearer(request);
  if (!token) return null;

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
}

/** Emails promovidos por variável de ambiente, para o primeiro admin. */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Admin é quem tem `profiles.is_admin`, ou quem está na `ADMIN_EMAILS`
 * — esta segunda via existe para não ficar ninguém de fora antes de a
 * coluna ser marcada pela primeira vez.
 */
export async function isAdmin(user: SessionUser): Promise<boolean> {
  if (user.email && adminEmails().includes(user.email.toLowerCase())) return true;

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { isAdmin: true },
    });
    return profile?.isAdmin ?? false;
  } catch {
    return false;
  }
}

export type Denied = { error: string; status: number };

/** `{ user }` quando pode entrar no painel; `{ denied }` quando não. */
export async function requireAdmin(
  request: Request,
): Promise<{ user: SessionUser } | { denied: Denied }> {
  const user = await userFromRequest(request);
  if (!user) return { denied: { error: "Sem sessão", status: 401 } };
  if (!(await isAdmin(user))) return { denied: { error: "Sem permissão", status: 403 } };
  return { user };
}
