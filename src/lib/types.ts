export type Gender = "male" | "female";

export type User = {
  name: string;
  email: string;
  gender: Gender;
};

export type TransactionType = "income" | "expense";

export type Transaction = {
  id: string;
  /** quem lançou; null em modo local */
  userId?: string | null;
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  date: string; // ISO yyyy-mm-dd
};

/** Quão depressa se quer o desejo. */
export type Priority = "alta" | "media" | "baixa";

/** Uma coisa que a família quer comprar. Ver `app/wishes`. */
export type Wish = {
  id: string;
  /** quem pediu; null em modo local */
  userId?: string | null;
  title: string;
  /** quanto custa */
  price: number;
  /** quanto já está guardado para isso */
  saved: number;
  category: string;
  priority: Priority;
  notes: string;
  /** para quando se quer ter; ISO yyyy-mm-dd ou null */
  targetDate: string | null;
  /** quando virou compra; null enquanto for só desejo */
  boughtAt: string | null;
};
