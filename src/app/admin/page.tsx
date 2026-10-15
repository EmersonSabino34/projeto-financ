"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Globe2,
  Laptop,
  MapPin,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Tablet,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { geoLabel, type AdminAccess, type AdminOverview, type AdminUser } from "@/lib/admin";
import { authJson } from "@/lib/api";
import { formatAgo, formatDateTime } from "@/lib/format";
import { deviceLabel } from "@/lib/user-agent";

export default function AdminPage() {
  return (
    <AppShell>
      <Admin />
    </AppShell>
  );
}

/** O ícone do aparelho de onde veio o acesso. */
function DeviceIcon({
  type,
  className,
}: {
  type: string | null | undefined;
  className?: string;
}) {
  if (type === "mobile") return <Smartphone className={className} />;
  if (type === "tablet") return <Tablet className={className} />;
  if (type === "desktop") return <Monitor className={className} />;
  return <Laptop className={className} />;
}

/**
 * Painel admin: quem tem conta, quem está ativo e por onde entrou.
 *
 * Os dados vêm de `/api/admin/*`, que valida a sessão e a permissão no
 * servidor — esta página não decide nada sozinha. Quem não for admin
 * recebe 403 e vê a mensagem.
 */
function Admin() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  // muda a cada "recarregar" e é isso que dispara o pedido outra vez
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;

    authJson<AdminOverview>("/api/admin/users")
      .then((body) => {
        if (!active) return;
        setData(body);
        setError("");
      })
      .catch((failure: unknown) => {
        if (!active) return;
        setError(failure instanceof Error ? failure.message : "Falha a carregar.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tick]);

  const reload = useCallback(() => {
    setLoading(true);
    setTick((t) => t + 1);
  }, []);

  const users = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.users ?? []).filter((user) => {
      if (onlyActive && !user.isActive) return false;
      if (!term) return true;
      return (
        user.name.toLowerCase().includes(term) ||
        (user.email ?? "").toLowerCase().includes(term) ||
        geoLabel(user.lastAccess ?? {}).toLowerCase().includes(term)
      );
    });
  }, [data, onlyActive, query]);

  if (error) {
    return (
      <div className="animate-rise rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-zinc-600" />
        <h1 className="mt-3 text-lg font-semibold">Painel admin</h1>
        <p className="mt-1 text-sm text-rose-400">{error}</p>
        <button
          onClick={reload}
          className="mx-auto mt-5 flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-rise">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft">
          <ShieldCheck className="h-5 w-5 text-accent-line" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Painel admin</h1>
          <p className="text-xs text-zinc-500">Contas, acessos e dispositivos</p>
        </div>
        <button
          onClick={reload}
          aria-label="Recarregar"
          className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-accent-line"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      {/* NÚMEROS */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Contas" value={data?.totals.users ?? 0} icon={Users} />
        <Stat
          label="Ativas"
          value={data?.totals.active ?? 0}
          icon={ShieldCheck}
          tone="text-emerald-400 bg-emerald-400/10"
        />
        <Stat
          label="Ativos 24h"
          value={data?.totals.online24h ?? 0}
          icon={Globe2}
          tone="text-sky-400 bg-sky-400/10"
        />
        <Stat
          label="Acessos"
          value={data?.totals.accesses ?? 0}
          icon={MapPin}
          tone="text-amber-400 bg-amber-400/10"
        />
      </section>

      {/* FILTROS */}
      <section className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Procurar por nome, email ou cidade…"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-500 focus:border-accent-line"
        />
        <button
          onClick={() => setOnlyActive((v) => !v)}
          className={`shrink-0 rounded-xl border px-4 py-3 text-sm font-medium transition ${
            onlyActive
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          Só contas ativas
        </button>
      </section>

      {/* PESSOAS */}
      {loading && !data ? (
        <p className="py-10 text-center text-sm text-zinc-500">A carregar…</p>
      ) : users.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
          Ninguém encontrado.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone = "text-accent-line bg-accent-soft",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}

/** Uma pessoa na lista; abre para mostrar o histórico de acessos. */
function UserRow({ user }: { user: AdminUser }) {
  const [open, setOpen] = useState(false);
  const [accesses, setAccesses] = useState<AdminAccess[] | null>(null);
  const [error, setError] = useState("");

  const last = user.lastAccess;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || accesses) return;

    try {
      const body = await authJson<{ accesses: AdminAccess[] }>(
        `/api/admin/accesses?user=${user.id}&limit=50`,
      );
      setAccesses(body.accesses);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Falha a carregar.");
    }
  }

  return (
    <li className="rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:border-zinc-700">
      <button onClick={toggle} className="flex w-full items-start gap-3 p-4 text-left">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            user.isActive
              ? "bg-emerald-400/10 text-emerald-400"
              : "bg-zinc-800 text-zinc-500"
          }`}
        >
          <DeviceIcon type={last?.deviceType} className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{user.name}</p>
            {user.isAdmin && (
              <span className="shrink-0 rounded-full border border-accent-line/40 bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-line">
                admin
              </span>
            )}
            {!user.isActive && (
              <span className="shrink-0 rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                por confirmar
              </span>
            )}
          </div>

          <p className="truncate text-xs text-zinc-500">{user.email ?? "sem email"}</p>

          <p className="mt-1.5 text-xs text-zinc-400">
            Último login: {formatDateTime(user.lastSignInAt)}{" "}
            <span className="text-zinc-600">({formatAgo(user.lastSignInAt)})</span>
          </p>

          <p className="text-xs text-zinc-500">
            {deviceLabel(last?.deviceType)}
            {last?.deviceModel ? ` ${last.deviceModel}` : ""}
            {last?.os ? ` · ${last.os}` : ""}
            {last?.browser ? ` · ${last.browser}` : ""}
          </p>

          <p className="text-xs text-zinc-500">
            <MapPin className="mr-1 inline h-3 w-3" />
            {geoLabel(last ?? {})}
            {last?.ip ? ` · ${last.ip}` : ""}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs text-zinc-500">{user.accessCount} acessos</p>
          {open ? (
            <ChevronDown className="ml-auto mt-2 h-4 w-4 text-zinc-600" />
          ) : (
            <ChevronRight className="ml-auto mt-2 h-4 w-4 text-zinc-600" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Histórico de acessos
          </p>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          {!error && accesses === null && (
            <p className="text-sm text-zinc-500">A carregar…</p>
          )}

          {accesses?.length === 0 && (
            <p className="text-sm text-zinc-500">
              Ainda sem acessos registados. O registo começa no próximo login.
            </p>
          )}

          {accesses && accesses.length > 0 && (
            <ul className="space-y-2">
              {accesses.map((access) => {
                return (
                  <li
                    key={access.id}
                    className="flex items-start gap-2.5 rounded-xl bg-zinc-800/50 px-3 py-2.5"
                  >
                    <DeviceIcon
                      type={access.deviceType}
                      className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
                    />
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="text-zinc-300">
                        {formatDateTime(access.occurredAt)}
                        <span className="text-zinc-600">
                          {" "}
                          · {access.event === "login" ? "entrou" : "retomou"}
                        </span>
                      </p>
                      <p className="text-zinc-500">
                        {deviceLabel(access.deviceType)}
                        {access.deviceModel ? ` ${access.deviceModel}` : ""}
                        {access.os ? ` · ${access.os}` : ""}
                        {access.browser ? ` · ${access.browser}` : ""}
                      </p>
                      <p className="text-zinc-500">
                        {geoLabel(access)}
                        {access.timezone ? ` · ${access.timezone}` : ""}
                        {access.ip ? ` · ${access.ip}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
