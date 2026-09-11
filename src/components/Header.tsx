"use client";

import { useRouter } from "next/navigation";
import { LogOut, Wallet } from "lucide-react";

import { useStore } from "@/lib/store";

export function Header() {
  const { user, signOut } = useStore();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
          <Wallet className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">
            Olá, {user?.name ?? "visitante"} 👋
          </p>
          <p className="truncate text-xs text-zinc-500">Family Finance</p>
        </div>

        <button
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
          aria-label="Sair"
          className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-rose-400"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
