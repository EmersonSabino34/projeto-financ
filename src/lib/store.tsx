"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  isSupabaseConfigured,
  rowToTransaction,
  supabase,
  type Household,
  type Member,
  type TransactionRow,
} from "./supabase";
import type { Gender, Transaction, User } from "./types";

/**
 * Duas fontes de dados:
 *
 * - "supabase": tabela public.transactions + Supabase Auth (ver supabase/schema.sql)
 * - "local":   localStorage, para desenvolver sem credenciais
 *
 * As telas não sabem a diferença — falam só com `useStore()`.
 */
export const backend = isSupabaseConfigured ? "supabase" : "local";

const USER_KEY = "ff.user";
const TX_KEY = "ff.transactions";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toISODate(d);
}

export function toISODate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function seedTransactions(): Transaction[] {
  return [
    { id: "s1", type: "income", description: "Salário", amount: 3000, category: "salario", date: isoDaysAgo(14) },
    { id: "s2", type: "expense", description: "Compras online", amount: 105, category: "outros", date: isoDaysAgo(9) },
    { id: "s3", type: "expense", description: "Seguro da casa", amount: 95, category: "casa", date: isoDaysAgo(8) },
    { id: "s4", type: "expense", description: "Eletricidade", amount: 78, category: "contas", date: isoDaysAgo(6) },
    { id: "s5", type: "expense", description: "Ginásio", amount: 45, category: "saude", date: isoDaysAgo(5) },
    { id: "s6", type: "expense", description: "Internet", amount: 40, category: "contas", date: isoDaysAgo(4) },
    { id: "s7", type: "expense", description: "Supermercado", amount: 85, category: "mercado", date: isoDaysAgo(3) },
    { id: "s8", type: "expense", description: "Combustível", amount: 60, category: "carro", date: isoDaysAgo(2) },
    { id: "s9", type: "expense", description: "Restaurante", amount: 42, category: "comida", date: isoDaysAgo(1) },
  ];
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* modo privado / storage bloqueado */
  }
}

export type TransactionInput = Omit<Transaction, "id">;

type Store = {
  ready: boolean;
  user: User | null;
  /** carteira partilhada; null em modo local */
  household: Household | null;
  /** quem partilha a carteira, por id */
  members: Record<string, string>;
  transactions: Transaction[];
  totals: { balance: number; income: number; expense: number };
  /** null = sucesso; string = mensagem de erro para mostrar na tela */
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    name: string,
    email: string,
    password: string,
    gender: Gender,
  ) => Promise<string | null>;
  signOut: () => Promise<void>;
  addTransaction: (tx: TransactionInput) => Promise<void>;
  updateTransaction: (id: string, tx: TransactionInput) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  /** entra na carteira de outra pessoa pelo código do convite */
  joinHousehold: (code: string) => Promise<string | null>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  /* ---------------- carregar ---------------- */

  const loadTransactions = useCallback(async (householdId: string | null) => {
    if (!supabase || !householdId) {
      setTransactions([]);
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("household_id", householdId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Falha ao carregar transações:", error.message);
      return;
    }

    setTransactions((data as TransactionRow[]).map(rowToTransaction));
  }, []);

  /**
   * Garante que o utilizador tem carteira (cria na primeira vez) e traz
   * os nomes de quem a partilha. Ver ensure_household em supabase/schema.sql.
   */
  const loadHousehold = useCallback(async (): Promise<string | null> => {
    if (!supabase) return null;

    const { data: hid, error } = await supabase.rpc("ensure_household");
    if (error || !hid) {
      console.error("Falha ao abrir a carteira:", error?.message);
      return null;
    }

    const { data: h } = await supabase
      .from("households")
      .select("id, name, invite_code")
      .eq("id", hid)
      .single();

    setHousehold((h as Household) ?? null);

    const { data: people } = await supabase
      .from("profiles")
      .select("id, name")
      .in(
        "id",
        (
          await supabase
            .from("household_members")
            .select("user_id")
            .eq("household_id", hid)
        ).data?.map((m) => (m as { user_id: string }).user_id) ?? [],
      );

    setMembers(
      Object.fromEntries(((people as Member[]) ?? []).map((m) => [m.id, m.name])),
    );

    return hid as string;
  }, []);

  /** Lê o localStorage fora do render (async, para não disparar re-render em cascata). */
  const loadLocal = useCallback(async () => {
    return {
      user: read<User | null>(USER_KEY, null),
      transactions: read<Transaction[]>(TX_KEY, seedTransactions()),
    };
  }, []);

  useEffect(() => {
    let active = true;

    // modo local: tudo sai do localStorage
    if (!supabase) {
      loadLocal().then((local) => {
        if (!active) return;
        setUser(local.user);
        setTransactions(local.transactions);
        setReady(true);
      });
      return () => {
        active = false;
      };
    }

    // modo supabase: sessão + transações do utilizador
    const client = supabase;

    async function sync(userId: string | null, meta: Record<string, unknown> = {}) {
      if (!active) return;

      if (!userId) {
        setUser(null);
        setHousehold(null);
        setMembers({});
        setTransactions([]);
        setReady(true);
        return;
      }

      setUser({
        name: (meta.name as string) ?? (meta.email as string) ?? "",
        email: (meta.email as string) ?? "",
        gender: (meta.gender as Gender) ?? "male",
      });
      const householdId = await loadHousehold();
      await loadTransactions(householdId);
      if (active) setReady(true);
    }

    client.auth.getSession().then(({ data }) => {
      const session = data.session;
      sync(session?.user.id ?? null, {
        ...session?.user.user_metadata,
        email: session?.user.email,
      });
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      sync(session?.user.id ?? null, {
        ...session?.user.user_metadata,
        email: session?.user.email,
      });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadHousehold, loadLocal, loadTransactions]);

  /* ---------------- autenticação ---------------- */

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!supabase) {
        const next: User = {
          name: email.split("@")[0],
          email,
          gender: read<User | null>(USER_KEY, null)?.gender ?? "male",
        };
        setUser(next);
        write(USER_KEY, next);
        return null;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    },
    [],
  );

  const signUp = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      gender: Gender,
    ): Promise<string | null> => {
      if (!supabase) {
        const next: User = { name, email, gender };
        setUser(next);
        write(USER_KEY, next);
        return null;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, gender } },
      });
      return error ? error.message : null;
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      setUser(null);
      write(USER_KEY, null);
      return;
    }
    await supabase.auth.signOut();
  }, []);

  /* ---------------- CRUD ---------------- */

  const persistLocal = useCallback((next: Transaction[]) => {
    setTransactions(next);
    write(TX_KEY, next);
  }, []);

  /** id da carteira e de quem está a lançar, para escrever na tabela */
  const currentScope = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id ?? null;
    if (!userId) return null;

    const householdId = household?.id ?? (await loadHousehold());
    if (!householdId) return null;

    return { userId, householdId };
  }, [household?.id, loadHousehold]);

  const addTransaction = useCallback(
    async (tx: TransactionInput) => {
      if (!supabase) {
        persistLocal([{ ...tx, id: crypto.randomUUID() }, ...transactions]);
        return;
      }

      const scope = await currentScope();
      if (!scope) return;

      const { error } = await supabase.from("transactions").insert({
        household_id: scope.householdId,
        user_id: scope.userId,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        date: tx.date,
      });

      if (error) {
        console.error("Falha ao adicionar:", error.message);
        return;
      }
      await loadTransactions(scope.householdId);
    },
    [currentScope, loadTransactions, persistLocal, transactions],
  );

  const updateTransaction = useCallback(
    async (id: string, tx: TransactionInput) => {
      if (!supabase) {
        persistLocal(transactions.map((t) => (t.id === id ? { ...tx, id } : t)));
        return;
      }

      const scope = await currentScope();
      if (!scope) return;

      const { error } = await supabase
        .from("transactions")
        .update({
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          category: tx.category,
          date: tx.date,
        })
        .eq("id", id)
        .eq("household_id", scope.householdId);

      if (error) {
        console.error("Falha ao editar:", error.message);
        return;
      }
      await loadTransactions(scope.householdId);
    },
    [currentScope, loadTransactions, persistLocal, transactions],
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      if (!supabase) {
        persistLocal(transactions.filter((t) => t.id !== id));
        return;
      }

      const scope = await currentScope();
      if (!scope) return;

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("household_id", scope.householdId);

      if (error) {
        console.error("Falha ao excluir:", error.message);
        return;
      }
      await loadTransactions(scope.householdId);
    },
    [currentScope, loadTransactions, persistLocal, transactions],
  );

  const joinHousehold = useCallback(
    async (code: string): Promise<string | null> => {
      if (!supabase) return "Disponível só com o Supabase ligado.";

      const { error } = await supabase.rpc("join_household", { code });
      if (error) return error.message;

      const householdId = await loadHousehold();
      await loadTransactions(householdId);
      return null;
    },
    [loadHousehold, loadTransactions],
  );

  /* ---------------- totais ---------------- */

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const value = useMemo<Store>(
    () => ({
      ready,
      user,
      household,
      members,
      transactions,
      totals,
      signIn,
      signUp,
      signOut,
      addTransaction,
      updateTransaction,
      removeTransaction,
      joinHousehold,
    }),
    [
      ready,
      user,
      household,
      members,
      transactions,
      totals,
      signIn,
      signUp,
      signOut,
      addTransaction,
      updateTransaction,
      removeTransaction,
      joinHousehold,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}
