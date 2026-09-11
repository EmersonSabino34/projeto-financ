"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

import type { Transaction } from "@/lib/types";

/** Confirmação de exclusão de um lançamento. */
export function ConfirmDelete({
  tx,
  onCancel,
  onConfirm,
}: {
  tx: Transaction;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm animate-rise rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10">
          <AlertTriangle className="h-6 w-6 text-rose-400" />
        </div>

        <h2 className="text-lg font-semibold">Excluir lançamento?</h2>
        <p className="mt-1 text-sm text-zinc-400">
          &ldquo;{tx.description}&rdquo; será removido definitivamente.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-zinc-700 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-rose-600 py-3 font-semibold text-white transition hover:bg-rose-700"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
