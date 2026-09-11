"use client";

import type { ComponentType, ReactNode } from "react";
import { PiggyBank, Wallet } from "lucide-react";

export const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800 py-3 pl-11 pr-4 outline-none transition placeholder:text-zinc-500 focus:border-accent-line";

/** Moldura das telas de login e registo: logo, cartão e rodapé. */
export function AuthCard({
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-md animate-rise">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent shadow-lg">
            <Wallet className="h-8 w-8 text-white" strokeWidth={2.2} />
          </div>

          <h1 className="text-3xl font-bold tracking-tight">Family Finance</h1>

          <p className="mt-2 text-sm text-zinc-400">
            Controle simples das finanças de vocês.
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-7 shadow-2xl">
          <div className="mb-6">
            <h2 className="flex items-center gap-2 text-2xl font-semibold">
              <Icon className="h-5 w-5 text-accent-line" />
              {title}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
          </div>

          {children}

          <div className="mt-6 text-center text-sm text-zinc-400">{footer}</div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-zinc-600">
          <PiggyBank className="h-3.5 w-3.5" />
          Suas finanças. Seu controle. Sua família.
        </p>
      </div>
    </main>
  );
}

/** Campo com rótulo e ícone à esquerda. */
export function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-300">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        {children}
      </div>
    </div>
  );
}
