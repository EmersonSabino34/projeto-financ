"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Wallet } from "lucide-react";

import { useStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const { ready, user } = useStore();

  useEffect(() => {
    if (!ready) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [ready, user, router]);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-3 text-zinc-500">
        <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-accent">
          <Wallet className="h-7 w-7 text-white" />
        </div>
        <p className="text-sm">A carregar…</p>
      </div>
    </main>
  );
}
