"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { ExpenseItem } from "@/components/ExpenseItem";
import { HouseholdCard } from "@/components/HouseholdCard";
import { TransactionModal } from "@/components/TransactionModal";
import { findCategory } from "@/lib/categories";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Transaction, TransactionType } from "@/lib/types";

export default function DashboardPage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

function Dashboard() {
  const {
    transactions,
    totals,
    members,
    addTransaction,
    updateTransaction,
    removeTransaction,
  } = useStore();

  // com uma pessoa só, dizer quem lançou é ruído
  const shared = Object.keys(members).length > 1;

  const [modalType, setModalType] = useState<TransactionType | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [transactions],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return [...map.entries()]
      .map(([id, total]) => ({ category: findCategory(id), total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [transactions]);

  const positive = totals.balance >= 0;

  return (
    <div className="space-y-6 animate-rise">
      {/* SALDO */}
      <Card label="Saldo" value={totals.balance} icon={Wallet} highlight>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
          {positive ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
          )}
          {positive ? "As contas estão no azul." : "As despesas passaram as receitas."}
        </p>
      </Card>

      {/* RECEITAS / DESPESAS */}
      <section className="grid grid-cols-2 gap-4">
        <Card
          label="Receitas"
          value={totals.income}
          icon={TrendingUp}
          tone="text-emerald-400 bg-emerald-400/10"
        />
        <Card
          label="Despesas"
          value={totals.expense}
          icon={TrendingDown}
          tone="text-rose-400 bg-rose-400/10"
        />
      </section>

      {/* NOVA TRANSAÇÃO */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <Plus className="h-4 w-4 text-accent-line" />
          Nova transação
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setModalType("income")}
            className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-4 font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
          >
            <ArrowUpCircle className="h-5 w-5" />
            Receita
          </button>

          <button
            onClick={() => setModalType("expense")}
            className="flex items-center justify-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 py-4 font-semibold text-rose-400 transition hover:bg-rose-500/20"
          >
            <ArrowDownCircle className="h-5 w-5" />
            Gasto
          </button>
        </div>
      </section>

      {/* GASTOS POR CATEGORIA */}
      {byCategory.length > 0 && (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <Receipt className="h-4 w-4 text-accent-line" />
            Onde o dinheiro foi
          </h2>

          <ul className="space-y-3.5">
            {byCategory.map(({ category, total }) => {
              const Icon = category.icon;
              const percent = totals.expense > 0 ? (total / totals.expense) * 100 : 0;
              return (
                <li key={category.id}>
                  <div className="mb-1.5 flex items-center gap-2 text-sm">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${category.color}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 text-zinc-300">{category.label}</span>
                    <span className="font-medium">{formatMoney(total)}</span>
                    <span className="w-10 text-right text-xs text-zinc-500">
                      {percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* CARTEIRA PARTILHADA */}
      <HouseholdCard />

      {/* TRANSAÇÕES */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">Transações</h2>

        {recent.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
            Nenhuma transação registada.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {recent.map((tx) => (
              <ExpenseItem
                key={tx.id}
                tx={tx}
                author={shared ? members[tx.userId ?? ""] : undefined}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ))}
          </ul>
        )}
      </section>

      {modalType !== null && (
        <TransactionModal
          defaultType={modalType}
          onClose={() => setModalType(null)}
          onSave={addTransaction}
        />
      )}

      {editing && (
        <TransactionModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(tx) => updateTransaction(editing.id, tx)}
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
