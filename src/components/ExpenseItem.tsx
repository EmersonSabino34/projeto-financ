"use client";

import { Pencil, Trash2 } from "lucide-react";

import { findCategory } from "@/lib/categories";
import { formatDate, formatMoney } from "@/lib/format";
import type { Transaction } from "@/lib/types";

type Props = {
  tx: Transaction;
  /** nome de quem lançou; só aparece em carteira com mais de uma pessoa */
  author?: string;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
};

export function ExpenseItem({ tx, author, onEdit, onDelete }: Props) {
  const category = findCategory(tx.category);
  const Icon = category.icon;
  const isIncome = tx.type === "income";

  return (
    <li className="group flex items-center gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5 transition hover:border-zinc-700">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${category.color}`}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{tx.description}</p>
        <p className="text-xs text-zinc-500">
          {category.label} · {formatDate(tx.date)}
          {author ? ` · ${author}` : ""}
        </p>
      </div>

      <div className="text-right">
        <p className={`whitespace-nowrap text-sm font-semibold sm:text-base ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
          {isIncome ? "+" : "−"} {formatMoney(tx.amount)}
        </p>
      </div>

      {(onEdit || onDelete) && (
        <div className="flex shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(tx)}
              aria-label={`Editar ${tx.description}`}
              className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-accent-line"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(tx)}
              aria-label={`Excluir ${tx.description}`}
              className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-rose-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
