import type { Priority, Wish } from "./types";

/** Cor e nome de cada prioridade, para os selos da página de desejos. */
export const priorityMeta: Record<
  Priority,
  { label: string; classes: string; dot: string }
> = {
  alta: {
    label: "Alta",
    classes: "border-rose-500/40 bg-rose-500/10 text-rose-400",
    dot: "bg-rose-400",
  },
  media: {
    label: "Média",
    classes: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    dot: "bg-amber-400",
  },
  baixa: {
    label: "Baixa",
    classes: "border-sky-500/40 bg-sky-500/10 text-sky-400",
    dot: "bg-sky-400",
  },
};

export const priorities: Priority[] = ["alta", "media", "baixa"];

const order: Record<Priority, number> = { alta: 0, media: 1, baixa: 2 };

/** Por realizar primeiro, e dentro disso por prioridade. */
export function sortWishes(wishes: Wish[]): Wish[] {
  return [...wishes].sort((a, b) => {
    if (Boolean(a.boughtAt) !== Boolean(b.boughtAt)) return a.boughtAt ? 1 : -1;
    return order[a.priority] - order[b.priority];
  });
}

/** Quanto do preço já está guardado, de 0 a 100. */
export function progressOf(wish: Wish): number {
  if (wish.price <= 0) return 100;
  return Math.min(100, Math.max(0, (wish.saved / wish.price) * 100));
}

export type WishTotals = {
  /** quanto custa tudo o que ainda falta comprar */
  wanted: number;
  /** quanto já está guardado para esses desejos */
  saved: number;
  /** o que falta juntar */
  missing: number;
  pending: number;
  done: number;
};

export function wishTotals(wishes: Wish[]): WishTotals {
  let wanted = 0;
  let saved = 0;
  let pending = 0;
  let done = 0;

  for (const wish of wishes) {
    if (wish.boughtAt) {
      done += 1;
      continue;
    }
    pending += 1;
    wanted += wish.price;
    saved += Math.min(wish.saved, wish.price);
  }

  return { wanted, saved, missing: Math.max(0, wanted - saved), pending, done };
}
