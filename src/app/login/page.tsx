"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Aviso } from "@/components/Aviso";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/gerar";

  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    setCarregando(true);
    const supabase = createClient();

    if (modo === "cadastro") {
      const { data, error } = await supabase.auth.signUp({ email, password: senha });
      if (error) setErro(traduzir(error.message));
      else if (data.session) router.replace(redirect);
      else setMsg("Conta criada! Confirme o e-mail (se exigido) e faca login.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setErro(traduzir(error.message));
      else {
        router.replace(redirect);
        router.refresh();
      }
    }
    setCarregando(false);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">
        {modo === "login" ? "Entrar no SorteIA" : "Criar conta"}
      </h1>
      <Aviso compacto />

      <form onSubmit={enviar} className="card space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs text-slate-400">E-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className="w-full rounded-lg bg-white/5 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-brand"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-slate-400">Senha</span>
          <input
            type="password"
            required
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="minimo 6 caracteres"
            className="w-full rounded-lg bg-white/5 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-brand"
          />
        </label>

        <button type="submit" className="btn-primary w-full" disabled={carregando}>
          {carregando ? "Aguarde..." : modo === "login" ? "Entrar" : "Cadastrar"}
        </button>
        {erro && <p className="text-sm text-red-400">{erro}</p>}
        {msg && <p className="text-sm text-brand-light">{msg}</p>}
      </form>

      <button
        onClick={() => {
          setModo(modo === "login" ? "cadastro" : "login");
          setErro("");
          setMsg("");
        }}
        className="w-full text-center text-sm text-slate-400 hover:text-slate-200"
      >
        {modo === "login"
          ? "Nao tem conta? Cadastre-se"
          : "Ja tem conta? Entrar"}
      </button>
    </div>
  );
}

function traduzir(m: string): string {
  if (/Invalid login credentials/i.test(m)) return "E-mail ou senha invalidos.";
  if (/already registered/i.test(m)) return "Este e-mail ja tem conta.";
  if (/at least 6/i.test(m)) return "A senha precisa de ao menos 6 caracteres.";
  return m;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-slate-400">Carregando...</p>}>
      <LoginInner />
    </Suspense>
  );
}
