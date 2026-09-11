"use client";

import { AppShell } from "@/components/AppShell";
import { TransactionsView } from "@/components/TransactionsView";

export default function ExpensesPage() {
  return (
    <AppShell>
      <TransactionsView type="expense" title="Gastos" />
    </AppShell>
  );
}
