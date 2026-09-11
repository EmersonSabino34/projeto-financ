"use client";

import { AppShell } from "@/components/AppShell";
import { TransactionsView } from "@/components/TransactionsView";

export default function IncomePage() {
  return (
    <AppShell>
      <TransactionsView type="income" title="Receitas" />
    </AppShell>
  );
}
