import { supabase } from "./supabase";

/**
 * `fetch` para as rotas em `/api`, já com o access token do Supabase.
 *
 * As rotas do servidor não leem cookies — validam o token que vai no
 * `Authorization`. Ver `lib/server-auth.ts`.
 */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!supabase) throw new Error("Disponível só com o Supabase ligado.");

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sem sessão.");

  return fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
      authorization: `Bearer ${token}`,
    },
  });
}

/** Como acima, mas já devolve o JSON e transforma o erro em `Error`. */
export async function authJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, init);
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;

  if (!res.ok) {
    throw new Error(body?.error ?? `Pedido falhou (${res.status}).`);
  }
  return body as T;
}
