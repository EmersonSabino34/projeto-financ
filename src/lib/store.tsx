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

import { authFetch } from "./api";
import {
  isSupabaseConfigured,
  rowToTransaction,
  rowToWish,
  supabase,
  type Household,
  type Member,
  type TransactionRow,
  type WishRow,
} from "./supabase";
import type { Gender, Transaction, User, Wish } from "./types";

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
const WISH_KEY = "ff.wishes";

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

function seedWishes(): Wish[] {
  return [
    {
      id: "w1",
      title: "Férias no Algarve",
      price: 1200,
      saved: 300,
      category: "lazer",
      priority: "alta",
      notes: "Uma semana em agosto.",
      targetDate: null,
      boughtAt: null,
    },
    {
      id: "w2",
      title: "Máquina de lavar nova",
      price: 450,
      saved: 450,
      category: "casa",
      priority: "media",
      notes: "",
      targetDate: null,
      boughtAt: null,
    },
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
export type WishInput = Omit<Wish, "id" | "userId">;

/**
 * Regista o acesso no servidor (data, hora, aparelho, sistema e local).
 * 'login' = entrou agora; 'resume' = abriu com a sessão já aberta.
 *
 * É melhor-esforço: se falhar, ninguém fica sem entrar.
 */
async function reportAccess(event: "login" | "resume") {
  if (!supabase) return;
  try {
    await authFetch("/api/track", {
      method: "POST",
      body: JSON.stringify({ event }),
    });
  } catch {
    /* sem rede ou sem DATABASE_URL: o app continua igual */
  }
}

async function fetchIsAdmin(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const res = await authFetch("/api/admin/me");
    if (!res.ok) return false;
    const body = (await res.json()) as { isAdmin?: boolean };
    return Boolean(body.isAdmin);
  } catch {
    return false;
  }
}

type Store = {
  ready: boolean;
  user: User | null;
  /** carteira partilhada; null em modo local */
  household: Household | null;
  /** quem partilha a carteira, por id */
  members: Record<string, string>;
  transactions: Transaction[];
  /** a lista de desejos da carteira */
  wishes: Wish[];
  /** pode abrir /admin */
  isAdmin: boolean;
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
  addWish: (wish: WishInput) => Promise<void>;
  updateWish: (id: string, wish: WishInput) => Promise<void>;
  removeWish: (id: string) => Promise<void>;
  /** marca como comprado (ou volta atrás) */
  toggleWishBought: (id: string) => Promise<void>;
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
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

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

  const loadWishes = useCallback(async (householdId: string | null) => {
    if (!supabase || !householdId) {
      setWishes([]);
      return;
    }

    const { data, error } = await supabase
      .from("wishes")
      .select("*")
      .eq("household_id", householdId)
      .order("bought_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Falha ao carregar os desejos:", error.message);
      return;
    }

    setWishes((data as WishRow[]).map(rowToWish));
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
      wishes: read<Wish[]>(WISH_KEY, seedWishes()),
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
        setWishes(local.wishes);
        setReady(true);
      });
      return () => {
        active = false;
      };
    }

    // modo supabase: sessão + transações do utilizador
    const client = supabase;

    async function sync(
      userId: string | null,
      meta: Record<string, unknown> = {},
      event: "login" | "resume" | null = null,
    ) {
      if (!active) return;

      if (!userId) {
        setUser(null);
        setHousehold(null);
        setMembers({});
        setTransactions([]);
        setWishes([]);
        setIsAdmin(false);
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
      await loadWishes(householdId);
      if (active) setReady(true);

      // depois de a tela estar de pé: nada disto a segura
      if (event) void reportAccess(event);
      void fetchIsAdmin().then((value) => {
        if (active) setIsAdmin(value);
      });
    }

    client.auth.getSession().then(({ data }) => {
      const session = data.session;
      sync(
        session?.user.id ?? null,
        { ...session?.user.user_metadata, email: session?.user.email },
        session ? "resume" : null,
      );
    });

    const { data: sub } = client.auth.onAuthStateChange((authEvent, session) => {
      sync(
        session?.user.id ?? null,
        { ...session?.user.user_metadata, email: session?.user.email },
        authEvent === "SIGNED_IN" ? "login" : null,
      );
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadHousehold, loadLocal, loadTransactions, loadWishes]);

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

  /* ---------------- desejos ---------------- */

  const persistWishesLocal = useCallback((next: Wish[]) => {
    setWishes(next);
    write(WISH_KEY, next);
  }, []);

  /** Os campos do desejo, no formato da tabela. */
  const wishColumns = (wish: WishInput) => ({
    title: wish.title,
    price: wish.price,
    saved: wish.saved,
    category: wish.category,
    priority: wish.priority,
    notes: wish.notes,
    target_date: wish.targetDate,
    bought_at: wish.boughtAt,
  });

  const addWish = useCallback(
    async (wish: WishInput) => {
      if (!supabase) {
        persistWishesLocal([{ ...wish, id: crypto.randomUUID() }, ...wishes]);
        return;
      }

      const scope = await currentScope();
      if (!scope) return;

      const { error } = await supabase.from("wishes").insert({
        household_id: scope.householdId,
        user_id: scope.userId,
        ...wishColumns(wish),
      });

      if (error) {
        console.error("Falha ao guardar o desejo:", error.message);
        return;
      }
      await loadWishes(scope.householdId);
    },
    [currentScope, loadWishes, persistWishesLocal, wishes],
  );

  const updateWish = useCallback(
    async (id: string, wish: WishInput) => {
      if (!supabase) {
        persistWishesLocal(
          wishes.map((w) => (w.id === id ? { ...w, ...wish, id } : w)),
        );
        return;
      }

      const scope = await currentScope();
      if (!scope) return;

      const { error } = await supabase
        .from("wishes")
        .update(wishColumns(wish))
        .eq("id", id)
        .eq("household_id", scope.householdId);

      if (error) {
        console.error("Falha ao editar o desejo:", error.message);
        return;
      }
      await loadWishes(scope.householdId);
    },
    [currentScope, loadWishes, persistWishesLocal, wishes],
  );

  const removeWish = useCallback(
    async (id: string) => {
      if (!supabase) {
        persistWishesLocal(wishes.filter((w) => w.id !== id));
        return;
      }

      const scope = await currentScope();
      if (!scope) return;

      const { error } = await supabase
        .from("wishes")
        .delete()
        .eq("id", id)
        .eq("household_id", scope.householdId);

      if (error) {
        console.error("Falha ao excluir o desejo:", error.message);
        return;
      }
      await loadWishes(scope.householdId);
    },
    [currentScope, loadWishes, persistWishesLocal, wishes],
  );

  /** Comprado: guarda a data e dá o desejo por cumprido. */
  const toggleWishBought = useCallback(
    async (id: string) => {
      const wish = wishes.find((w) => w.id === id);
      if (!wish) return;

      const next: WishInput = {
        ...wish,
        boughtAt: wish.boughtAt ? null : new Date().toISOString(),
        // ao comprar, o que estava guardado passa a ser o preço todo
        saved: wish.boughtAt ? wish.saved : wish.price,
      };

      await updateWish(id, next);
    },
    [updateWish, wishes],
  );

  const joinHousehold = useCallback(
    async (code: string): Promise<string | null> => {
      if (!supabase) return "Disponível só com o Supabase ligado.";

      const { error } = await supabase.rpc("join_household", { code });
      if (error) return error.message;

      const householdId = await loadHousehold();
      await loadTransactions(householdId);
      await loadWishes(householdId);
      return null;
    },
    [loadHousehold, loadTransactions, loadWishes],
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
      wishes,
      isAdmin,
      totals,
      signIn,
      signUp,
      signOut,
      addTransaction,
      updateTransaction,
      removeTransaction,
      addWish,
      updateWish,
      removeWish,
      toggleWishBought,
      joinHousehold,
    }),
    [
      ready,
      user,
      household,
      members,
      transactions,
      wishes,
      isAdmin,
      totals,
      signIn,
      signUp,
      signOut,
      addTransaction,
      updateTransaction,
      removeTransaction,
      addWish,
      updateWish,
      removeWish,
      toggleWishBought,
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
