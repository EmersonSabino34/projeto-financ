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
