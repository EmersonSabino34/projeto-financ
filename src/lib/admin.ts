/**
 * O que o painel admin troca com a API (`/api/admin/*`).
 * Só tipos — pode ser importado pelo cliente.
 */

export type AdminAccess = {
  id: string;
  occurredAt: string;
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
};

export type AdminUser = {
  id: string;
  name: string;
  email: string | null;
  gender: string;
  isAdmin: boolean;
  /** conta ativa: email confirmado, sem banimento e não apagada */
  isActive: boolean;
  createdAt: string | null;
  /** último login segundo o Supabase Auth */
  lastSignInAt: string | null;
  accessCount: number;
  /** o acesso mais recente, com aparelho e local */
  lastAccess: AdminAccess | null;
};

export type AdminOverview = {
  users: AdminUser[];
  totals: {
    users: number;
    active: number;
    /** entraram nas últimas 24 horas */
    online24h: number;
    accesses: number;
  };
};

/** "Lisboa, Lisboa, Portugal" — salta o que não veio. */
export function geoLabel(geo: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string {
  const parts = [geo.city, geo.region, geo.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}
