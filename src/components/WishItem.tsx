"use client";

import { Check, Pencil, RotateCcw, Trash2 } from "lucide-react";

import { findCategory } from "@/lib/categories";
import { formatDate, formatMoney } from "@/lib/format";
import type { Wish } from "@/lib/types";
import { priorityMeta, progressOf } from "@/lib/wishes";

type Props = {
  wish: Wish;
  /** nome de quem pediu; só aparece em carteira com mais de uma pessoa */
  author?: string;
  onEdit?: (wish: Wish) => void;
  onDelete?: (wish: Wish) => void;
  onToggle?: (wish: Wish) => void;
};

/** Um desejo na lista, com o quanto já está guardado. */
export function WishItem({ wish, author, onEdit, onDelete, onToggle }: Props) {
  const category = findCategory(wish.category);
  const Icon = category.icon;
  const meta = priorityMeta[wish.priority];
  const percent = progressOf(wish);
  const bought = Boolean(wish.boughtAt);
  const missing = Math.max(0, wish.price - wish.saved);

  return (
    <li
      className={`rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700 ${
        bought ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${category.color}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`truncate font-medium ${bought ? "line-through" : ""}`}>
              {wish.title}
            </p>
            {!bought && (
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.classes}`}
              >
                {meta.label}
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-500">
            {category.label}
            {wish.targetDate ? ` · até ${formatDate(wish.targetDate)}` : ""}
            {author ? ` · ${author}` : ""}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="whitespace-nowrap text-sm font-semibold sm:text-base">
            {formatMoney(wish.price)}
          </p>
          {!bought && missing > 0 && (
            <p className="whitespace-nowrap text-xs text-zinc-500">
              faltam {formatMoney(missing)}
            </p>
          )}
        </div>
      </div>

      {!bought && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full ${percent >= 100 ? "bg-emerald-500" : "bg-accent"}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            {formatMoney(wish.saved)} guardados · {percent.toFixed(0)}%
            {percent >= 100 ? " — já dá para comprar" : ""}
          </p>
        </div>
      )}

      {wish.notes && (
        <p className="mt-3 rounded-xl bg-zinc-800/60 px-3 py-2 text-xs text-zinc-400">
          {wish.notes}
        </p>
      )}

      {(onEdit || onDelete || onToggle) && (
        <div className="mt-3 flex items-center gap-2">
          {onToggle && (
            <button
              onClick={() => onToggle(wish)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                bought
                  ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              }`}
            >
              {bought ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Voltar à lista
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Comprado
                </>
              )}
            </button>
          )}

          <div className="flex flex-1 justify-end">
            {onEdit && (
              <button
                onClick={() => onEdit(wish)}
                aria-label={`Editar ${wish.title}`}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-accent-line"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(wish)}
                aria-label={`Excluir ${wish.title}`}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
