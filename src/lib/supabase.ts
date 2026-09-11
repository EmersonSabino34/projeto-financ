import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Transaction } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * `true` quando as variáveis existem no `.env.local`:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *
 * Enquanto for `false`, o app funciona em modo local (localStorage).
 * Ver `lib/store.tsx`.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** Cliente Supabase, ou `null` enquanto não houver credenciais. */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null;

/** Uma linha da tabela `public.transactions` (ver supabase/schema.sql). */
export type TransactionRow = {
  id: string;
  household_id: string;
  user_id: string | null;
  type: "income" | "expense";
  amount: number | string; // numeric chega como string no supabase-js
  description: string;
  category: string;
  date: string;
  created_at?: string;
};

export type Household = {
  id: string;
  name: string;
  invite_code: string;
};

export type Member = {
  id: string;
  name: string;
};

export function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    category: row.category,
    date: row.date,
  };
}
