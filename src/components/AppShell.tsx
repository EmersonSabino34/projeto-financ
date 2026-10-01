"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { useStore } from "@/lib/store";

/** Moldura das páginas autenticadas: guarda de sessão + Header + BottomNav. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, user } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    document.documentElement.dataset.theme =
      user?.gender === "female" ? "female" : "male";
  }, [user?.gender]);

  if (!ready || !user) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        A carregar…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-950">
      <Header />

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 pb-28 pt-6">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
