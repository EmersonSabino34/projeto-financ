"use client";

import { useMemo, useState } from "react";
import { Gift, Plus, Sparkles, Target } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { WishItem } from "@/components/WishItem";
import { WishModal } from "@/components/WishModal";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Wish } from "@/lib/types";
import { sortWishes, wishTotals } from "@/lib/wishes";

export default function WishesPage() {
  return (
    <AppShell>
      <Wishes />
    </AppShell>
  );
}

function Wishes() {
  const { wishes, members, addWish, updateWish, removeWish, toggleWishBought } =
    useStore();

  // com uma pessoa só, dizer quem pediu é ruído
  const shared = Object.keys(members).length > 1;

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Wish | null>(null);
  const [deleting, setDeleting] = useState<Wish | null>(null);

  const pending = useMemo(
    () => sortWishes(wishes.filter((w) => !w.boughtAt)),
    [wishes],
  );
  const done = useMemo(
    () =>
      wishes
        .filter((w) => w.boughtAt)
        .sort((a, b) => (b.boughtAt ?? "").localeCompare(a.boughtAt ?? "")),
    [wishes],
  );

  const totals = useMemo(() => wishTotals(wishes), [wishes]);
  const percent = totals.wanted > 0 ? (totals.saved / totals.wanted) * 100 : 0;

  return (
    <div className="space-y-6 animate-rise">
      {/* RESUMO */}
      <section className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Sparkles className="h-4 w-4 text-accent-line" />
          Desejos da família
        </div>

        <p className="mt-2 text-4xl font-bold tracking-tight">
          {formatMoney(totals.wanted)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {totals.pending === 0
            ? "Nada na lista por agora."
            : `${totals.pending} ${totals.pending === 1 ? "desejo" : "desejos"} por realizar`}
          {totals.done > 0 ? ` · ${totals.done} já realizados` : ""}
        </p>

        {totals.wanted > 0 && (
          <>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-zinc-500">
              <span>{formatMoney(totals.saved)} guardados</span>
              <span>faltam {formatMoney(totals.missing)}</span>
            </div>
          </>
        )}
      </section>

      {/* NOVO DESEJO */}
      <button
        onClick={() => setCreating(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 font-semibold text-white transition hover:bg-accent-hover"
      >
        <Plus className="h-5 w-5" />
        Novo desejo
      </button>

      {/* POR REALIZAR */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <Target className="h-4 w-4 text-accent-line" />
          A caminho
        </h2>

        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
            A lista está vazia. Anote o que a família quer comprar — e veja
            quanto falta juntar.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {pending.map((wish) => (
              <WishItem
                key={wish.id}
                wish={wish}
                author={shared ? members[wish.userId ?? ""] : undefined}
                onEdit={setEditing}
                onDelete={setDeleting}
                onToggle={(w) => toggleWishBought(w.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* REALIZADOS */}
      {done.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <Gift className="h-4 w-4 text-emerald-400" />
            Realizados
          </h2>

          <ul className="space-y-2.5">
            {done.map((wish) => (
              <WishItem
                key={wish.id}
                wish={wish}
                author={shared ? members[wish.userId ?? ""] : undefined}
                onDelete={setDeleting}
                onToggle={(w) => toggleWishBought(w.id)}
              />
            ))}
          </ul>
        </section>
      )}

      {creating && (
        <WishModal onClose={() => setCreating(false)} onSave={addWish} />
      )}

      {editing && (
        <WishModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(wish) => updateWish(editing.id, wish)}
        />
      )}

      {deleting && (
        <ConfirmDelete
          heading="Excluir desejo?"
          name={deleting.title}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            removeWish(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
