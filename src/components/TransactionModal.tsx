"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownCircle, ArrowUpCircle, Check, X } from "lucide-react";

import { categoriesFor } from "@/lib/categories";
import { todayISO } from "@/lib/format";
import type { Transaction, TransactionType } from "@/lib/types";

type Props = {
  initial?: Transaction | null;
  defaultType?: TransactionType;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, "id">) => void;
};

export function TransactionModal({
  initial,
  defaultType = "expense",
  onClose,
  onSave,
}: Props) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? defaultType);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [category, setCategory] = useState(
    initial?.category ?? (defaultType === "income" ? "salario" : "mercado"),
  );
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const categories = categoriesFor(type);

  function switchType(next: TransactionType) {
    setType(next);
    setCategory(next === "income" ? "salario" : "mercado");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount.replace(",", "."));

    if (!description.trim()) {
      setError("Descreva o lançamento.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }

    onSave({
      type,
      description: description.trim(),
      amount: Math.round(value * 100) / 100,
      category,
      date,
    });
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-lg animate-rise overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {initial ? "Editar lançamento" : "Novo lançamento"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* TIPO */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => switchType("expense")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-medium transition ${
                type === "expense"
                  ? "border-rose-500 bg-rose-500/10 text-rose-400"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              <ArrowDownCircle className="h-5 w-5" />
              Despesa
            </button>
            <button
              type="button"
              onClick={() => switchType("income")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-medium transition ${
                type === "income"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              <ArrowUpCircle className="h-5 w-5" />
              Receita
            </button>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Descrição
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: compras do mês"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none transition placeholder:text-zinc-500 focus:border-accent-line"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Valor (R$)
              </label>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none transition placeholder:text-zinc-500 focus:border-accent-line"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none transition focus:border-accent-line"
              />
            </div>
          </div>

          {/* CATEGORIA */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Categoria
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {categories.map((c) => {
                const Icon = c.icon;
                const active = c.id === category;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs transition ${
                      active
                        ? "border-accent-line bg-accent-soft text-white"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-700 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-white transition hover:bg-accent-hover"
            >
              <Check className="h-4 w-4" />
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
