"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  AtSign,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  User as UserIcon,
} from "lucide-react";

import { AuthCard, Field, inputClass } from "@/components/AuthCard";
import { backend, useStore } from "@/lib/store";
import type { Gender } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useStore();

  const [gender, setGender] = useState<Gender>("male");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = gender === "female" ? "female" : "male";
  }, [gender]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Informe o seu nome.");
      return;
    }
    if (!email.trim()) {
      setError("Informe o seu email.");
      return;
    }
    if (password.length < 6) {
      setError("A palavra-passe precisa de pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As palavras-passe não coincidem.");
      return;
    }

    setBusy(true);
    const failure = await signUp(name.trim(), email.trim(), password, gender);
    setBusy(false);

    if (failure) {
      setError(failure);
      return;
    }

    // Com Supabase, a conta só fica ativa depois de confirmar o email.
    if (backend === "supabase") {
      setSent(true);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <AuthCard
      title="Criar conta"
      subtitle="Crie seu acesso para começar."
      icon={Sparkles}
      footer={
        <>
          Já possui uma conta?
          <Link
            href="/login"
            className="ml-2 font-semibold text-accent-line hover:underline"
          >
            Entrar
          </Link>
        </>
      }
    >
      {/* TEMA */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-medium text-zinc-300">Tema</label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setGender("male")}
            className={`rounded-xl border p-4 transition ${
              gender === "male"
                ? "border-blue-500 bg-blue-500/10"
                : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            <div className="text-2xl">👨</div>
            <div className="mt-1 text-sm font-medium">Masculino</div>
          </button>

          <button
            type="button"
            onClick={() => setGender("female")}
            className={`rounded-xl border p-4 transition ${
              gender === "female"
                ? "border-rose-500 bg-rose-500/10"
                : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            <div className="text-2xl">👩</div>
            <div className="mt-1 text-sm font-medium">Feminino</div>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome" icon={UserIcon}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className={inputClass}
          />
        </Field>

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

        <Field label="Confirmar palavra-passe" icon={Lock}>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
          />
        </Field>

        {sent && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            Conta criada. Confirme o email que enviámos e depois entre.
          </p>
        )}

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
          {busy ? "A criar…" : "Criar minha conta"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthCard>
  );
}
