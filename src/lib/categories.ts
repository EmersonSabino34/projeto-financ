import {
  Banknote,
  Briefcase,
  Bus,
  Car,
  CircleDollarSign,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  PiggyBank,
  Popcorn,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  Utensils,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { TransactionType } from "./types";

export type Category = {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string; // classes de cor do icone
};

export const expenseCategories: Category[] = [
  { id: "mercado", label: "Mercado", icon: ShoppingCart, color: "text-amber-400 bg-amber-400/10" },
  { id: "comida", label: "Comida", icon: Utensils, color: "text-orange-400 bg-orange-400/10" },
  { id: "casa", label: "Casa", icon: Home, color: "text-emerald-400 bg-emerald-400/10" },
  { id: "contas", label: "Contas", icon: Zap, color: "text-yellow-400 bg-yellow-400/10" },
  { id: "transporte", label: "Transporte", icon: Bus, color: "text-sky-400 bg-sky-400/10" },
  { id: "carro", label: "Carro", icon: Car, color: "text-indigo-400 bg-indigo-400/10" },
  { id: "saude", label: "Saúde", icon: HeartPulse, color: "text-rose-400 bg-rose-400/10" },
  { id: "educacao", label: "Educação", icon: GraduationCap, color: "text-violet-400 bg-violet-400/10" },
  { id: "lazer", label: "Lazer", icon: Popcorn, color: "text-pink-400 bg-pink-400/10" },
  { id: "telefone", label: "Telefone", icon: Smartphone, color: "text-cyan-400 bg-cyan-400/10" },
  { id: "presentes", label: "Presentes", icon: Gift, color: "text-fuchsia-400 bg-fuchsia-400/10" },
  { id: "outros", label: "Outros", icon: CircleDollarSign, color: "text-zinc-400 bg-zinc-400/10" },
];

export const incomeCategories: Category[] = [
  { id: "salario", label: "Salário", icon: Briefcase, color: "text-emerald-400 bg-emerald-400/10" },
  { id: "freelance", label: "Freelance", icon: Laptop, color: "text-sky-400 bg-sky-400/10" },
  { id: "investimentos", label: "Investimentos", icon: TrendingUp, color: "text-teal-400 bg-teal-400/10" },
  { id: "poupanca", label: "Poupança", icon: PiggyBank, color: "text-lime-400 bg-lime-400/10" },
  { id: "extra", label: "Extra", icon: Banknote, color: "text-amber-400 bg-amber-400/10" },
];

export function categoriesFor(type: TransactionType): Category[] {
  return type === "income" ? incomeCategories : expenseCategories;
}

const fallback: Category = {
  id: "outros",
  label: "Outros",
  icon: CircleDollarSign,
  color: "text-zinc-400 bg-zinc-400/10",
};

export function findCategory(id: string): Category {
  return (
    expenseCategories.find((c) => c.id === id) ??
    incomeCategories.find((c) => c.id === id) ??
    fallback
  );
}
