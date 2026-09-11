"use client";

import type { ComponentType, ReactNode } from "react";

import { formatMoney } from "@/lib/format";

type Props = {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  /** classes de cor do selo do ícone, ex.: "text-emerald-400 bg-emerald-400/10" */
  tone?: string;
  /** destaque: usa tipografia grande, para o saldo */
  highlight?: boolean;
  children?: ReactNode;
};

export function Card({
  label,
  value,
  icon: Icon,
  tone = "text-accent-line bg-accent-soft",
  highlight = false,
  children,
}: Props) {
  if (highlight) {
    return (
      <section className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Icon className="h-4 w-4 text-accent-line" />
          {label}
        </div>

        <p
          className={`mt-2 text-4xl font-bold tracking-tight ${
            value < 0 ? "text-rose-400" : "text-white"
          }`}
        >
          {formatMoney(value)}
        </p>

        {children}
      </section>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{formatMoney(value)}</p>
      {children}
    </div>
  );
}
