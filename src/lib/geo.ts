/**
 * De onde veio o acesso: país, estado/região e cidade.
 *
 * Três fontes, por ordem de confiança:
 *
 * 1. cabeçalhos da rede que serve o app (Vercel, Cloudflare) — vêm de
 *    graça e já resolvidos;
 * 2. consulta a um serviço de IP, quando não há cabeçalhos (ex.: em
 *    `next dev` atrás de um túnel). Pode ser trocado pela
 *    `GEO_LOOKUP_URL`, que recebe `{ip}`;
 * 3. nada — o painel mostra "—" e a coluna fica null.
 *
 * IPs privados (localhost, rede de casa) não são consultados.
 */

export type Geo = {
  ip: string | null;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
};

const unknownGeo: Geo = {
  ip: null,
  country: null,
  countryCode: null,
  region: null,
  city: null,
  timezone: null,
};

/** Nome do país em português a partir do código ISO ("PT" → "Portugal"). */
export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  try {
    const names = new Intl.DisplayNames(["pt"], { type: "region" });
    return names.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Vercel e Cloudflare mandam a cidade percent-encoded ("S%C3%A3o+Paulo"). */
function decode(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value.replace(/\+/g, " ")).trim() || null;
  } catch {
    return value;
  }
}

export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    null;
  // ::ffff:1.2.3.4 → 1.2.3.4
  return ip ? ip.replace(/^::ffff:/, "") : null;
}

export function isPrivateIp(ip: string | null): boolean {
  if (!ip) return true;
  if (ip === "::1" || ip === "127.0.0.1" || ip.startsWith("fc") || ip.startsWith("fd")) {
    return true;
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function fromHeaders(headers: Headers): Geo | null {
  const code =
    headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry") ?? null;

  const region =
    decode(headers.get("x-vercel-ip-country-region")) ??
    decode(headers.get("cf-region")) ??
    null;

  const city =
    decode(headers.get("x-vercel-ip-city")) ?? decode(headers.get("cf-ipcity")) ?? null;

  if (!code && !city) return null;

  return {
    ip: clientIp(headers),
    countryCode: code,
    country: countryName(code),
    region,
    city,
    timezone:
      headers.get("x-vercel-ip-timezone") ?? headers.get("cf-timezone") ?? null,
  };
}

type LookupResponse = {
  country_name?: string;
  country?: string;
  country_code?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  timezone?: string;
  error?: unknown;
};

async function lookup(ip: string): Promise<Geo | null> {
  const template = process.env.GEO_LOOKUP_URL ?? "https://ipapi.co/{ip}/json/";
  const url = template.replace("{ip}", encodeURIComponent(ip));

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as LookupResponse;
    if (data.error) return null;

    const code = data.country_code ?? data.countryCode ?? null;

    return {
      ip,
      countryCode: code,
      country: data.country_name ?? countryName(code) ?? data.country ?? null,
      region: data.regionName ?? data.region ?? null,
      city: data.city ?? null,
      timezone: data.timezone ?? null,
    };
  } catch {
    // rede fora, serviço no limite, timeout: o acesso regista-se na mesma
    return null;
  }
}

/** Resolve a origem do pedido. Nunca lança — no pior caso devolve tudo null. */
export async function resolveGeo(headers: Headers): Promise<Geo> {
  const fromNetwork = fromHeaders(headers);
  if (fromNetwork) return fromNetwork;

  const ip = clientIp(headers);
  if (!ip || isPrivateIp(ip)) return { ...unknownGeo, ip };

  return (await lookup(ip)) ?? { ...unknownGeo, ip };
}
