"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, AtSign, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

import { AuthCard, Field, inputClass } from "@/components/AuthCard";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { ready, user, signIn } = useStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      setError("Informe o seu email.");
      return;
    }
    if (!password) {
      setError("Informe a sua palavra-passe.");
      return;
    }

    setBusy(true);
    const failure = await signIn(email.trim(), password);
    setBusy(false);

    if (failure) {
      setError(failure);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <AuthCard
      title="Bem-vindo"
      subtitle="Entre para acompanhar suas finanças."
      icon={ShieldCheck}
      footer={
        <>
          Ainda não possui uma conta?
          <Link
            href="/register"
            className="ml-2 font-semibold text-accent-line hover:underline"
          >
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" icon={AtSign}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className={inputClass}
          />
        </Field>

        <Field label="Palavra-passe" icon={Lock}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={`${inputClass} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </Field>

        {error && (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60"
        >
          {busy ? "A entrar…" : "Entrar"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthCard>
  );
}
