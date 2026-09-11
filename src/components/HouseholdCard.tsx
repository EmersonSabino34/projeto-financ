"use client";

import { useState } from "react";
import { Check, Copy, Home, UserPlus, UserRound } from "lucide-react";

import { useStore } from "@/lib/store";

/**
 * Carteira partilhada: mostra o código do convite e deixa entrar
 * na carteira do par. Só aparece com o Supabase ligado.
 */
export function HouseholdCard() {
  const { household, members, joinHousehold } = useStore();

  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!household) return null;

  const names = Object.values(members).filter(Boolean);

  async function copyCode() {
    if (!household) return;
    try {
      await navigator.clipboard.writeText(household.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não consegui copiar. Anote o código à mão.");
    }
  }

  async function handleJoin() {
    if (!code.trim()) return;

    setBusy(true);
    const failure = await joinHousehold(code.trim());
    setBusy(false);

    if (failure) {
      setError(failure);
      return;
    }
    setError("");
    setCode("");
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Home className="h-5 w-5 text-accent-line" />
        {household.name}
      </h2>

      <ul className="mt-3 space-y-1.5">
        {names.map((name) => (
          <li key={name} className="flex items-center gap-2 text-sm text-zinc-300">
            <UserRound className="h-4 w-4 text-zinc-500" />
            {name}
          </li>
        ))}
      </ul>

      <p className="mt-5 text-sm text-zinc-400">Código de convite</p>

      <code className="mt-2 block rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-center font-mono text-2xl tracking-[0.3em]">
        {household.invite_code}
      </code>

      <button
        onClick={copyCode}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 py-3 font-medium text-zinc-200 transition hover:bg-zinc-800"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-emerald-400" />
            Copiado
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copiar código
          </>
        )}
      </button>

      <p className="mt-3 text-sm text-zinc-500">
        {names.length > 1
          ? "Os dois veem e editam os mesmos lançamentos."
          : "Quem usar este código entra na mesma carteira que você."}
      </p>

      {names.length <= 1 && (
        <>
          <p className="mt-5 text-sm text-zinc-400">
            Ou entre na carteira de alguém, com o código dessa pessoa:
          </p>

          <div className="mt-2 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 font-mono tracking-[0.2em] outline-none transition placeholder:text-zinc-600 focus:border-accent-line"
            />
            <button
              onClick={handleJoin}
              disabled={busy}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" />
              {busy ? "A entrar…" : "Entrar"}
            </button>
          </div>

          <p className="mt-2 text-xs text-zinc-600">
            Os seus lançamentos vão consigo para a carteira partilhada.
          </p>
        </>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {error}
        </p>
      )}
    </section>
  );
}
