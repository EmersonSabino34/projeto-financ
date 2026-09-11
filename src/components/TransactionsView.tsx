"use client";

import { useMemo, useState } from "react";
import { Inbox, Plus, Search } from "lucide-react";

import { ConfirmDelete } from "./ConfirmDelete";
import { ExpenseItem } from "./ExpenseItem";
import { TransactionModal } from "./TransactionModal";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Transaction, TransactionType } from "@/lib/types";

/** Lista de lançamentos de um tipo (gastos ou receitas), com busca, editar e excluir. */
export function TransactionsView({
  type,
  title,
}: {
  type: TransactionType;
  title: string;
}) {
  const { transactions, members, addTransaction, updateTransaction, removeTransaction } =
    useStore();

  const shared = Object.keys(members).length > 1;

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions
      .filter((t) => t.type === type)
      .filter((t) => (term ? t.description.toLowerCase().includes(term) : true))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, type, search]);

  const total = useMemo(
    () => visible.reduce((sum, t) => sum + t.amount, 0),
    [visible],
  );

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  return (
    <div className="space-y-5 animate-rise">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-zinc-500">
            {visible.length} {visible.length === 1 ? "registo" : "registos"} ·{" "}
            <span className={type === "income" ? "text-emerald-400" : "text-rose-400"}>
              {formatMoney(total)}
            </span>
          </p>
        </div>

        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Novo
        </button>
      </div>

      {/* BUSCA */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Procurar…"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-zinc-500 focus:border-accent-line"
        />
      </div>

      {/* LISTA */}
      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-800 p-12 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
          <p className="text-sm text-zinc-400">Nenhum registo encontrado.</p>
          <button
            onClick={openNew}
            className="mt-4 text-sm font-medium text-accent-line hover:underline"
          >
            Adicionar o primeiro
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {visible.map((tx) => (
            <ExpenseItem
              key={tx.id}
              tx={tx}
              author={shared ? members[tx.userId ?? ""] : undefined}
              onEdit={(t) => {
                setEditing(t);
                setModalOpen(true);
              }}
              onDelete={setDeleting}
            />
          ))}
        </ul>
      )}

      {modalOpen && (
        <TransactionModal
          initial={editing}
          defaultType={type}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={(tx) => {
            if (editing) updateTransaction(editing.id, tx);
            else addTransaction(tx);
          }}
        />
      )}

      {deleting && (
        <ConfirmDelete
          tx={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            removeTransaction(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
