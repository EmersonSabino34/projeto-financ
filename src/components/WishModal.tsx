"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";

import { categoriesFor } from "@/lib/categories";
import type { WishInput } from "@/lib/store";
import type { Priority, Wish } from "@/lib/types";
import { priorities, priorityMeta } from "@/lib/wishes";

type Props = {
  initial?: Wish | null;
  onClose: () => void;
  onSave: (wish: WishInput) => void;
};

/** Formulário de novo/editar desejo. Irmão do TransactionModal. */
export function WishModal({ initial, onClose, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [saved, setSaved] = useState(initial ? String(initial.saved) : "0");
  const [category, setCategory] = useState(initial?.category ?? "casa");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "media");
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // desejos são gastos que ainda não aconteceram: mesmas categorias
  const categories = categoriesFor("expense");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const priceValue = Number(price.replace(",", "."));
    const savedValue = Number((saved || "0").replace(",", "."));

    if (!title.trim()) {
      setError("Diga o que é.");
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setError("Informe um preço maior que zero.");
      return;
    }
    if (!Number.isFinite(savedValue) || savedValue < 0) {
      setError("O valor guardado não pode ser negativo.");
      return;
    }

    onSave({
      title: title.trim(),
      price: Math.round(priceValue * 100) / 100,
      saved: Math.round(savedValue * 100) / 100,
      category,
      priority,
      notes: notes.trim(),
      targetDate: targetDate || null,
      boughtAt: initial?.boughtAt ?? null,
    });
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-lg animate-rise overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {initial ? "Editar desejo" : "Novo desejo"}
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
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              O que é
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: férias no Algarve"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none transition placeholder:text-zinc-500 focus:border-accent-line"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Preço
              </label>
              <input
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none transition placeholder:text-zinc-500 focus:border-accent-line"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Já guardado
              </label>
              <input
                inputMode="decimal"
                value={saved}
                onChange={(e) => setSaved(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none transition placeholder:text-zinc-500 focus:border-accent-line"
              />
            </div>
          </div>

          {/* PRIORIDADE */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Prioridade
            </label>
            <div className="grid grid-cols-3 gap-3">
              {priorities.map((p) => {
                const meta = priorityMeta[p];
                const active = p === priority;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`rounded-xl border p-3 text-sm font-medium transition ${
                      active
                        ? meta.classes
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Para quando (opcional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none transition focus:border-accent-line"
            />
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

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Onde vimos, modelo, link…"
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none transition placeholder:text-zinc-500 focus:border-accent-line"
            />
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
