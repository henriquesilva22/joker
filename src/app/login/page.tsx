"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Aviso } from "@/components/Aviso";

// Login por magic link (Supabase Auth). Sem senha.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) setErro(error.message);
    else setEnviado(true);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Entrar no SorteIA</h1>
      <Aviso compacto />
      {enviado ? (
        <div className="card text-sm text-slate-200">
          📧 Enviamos um link de acesso para <strong>{email}</strong>. Abra o
          e-mail neste dispositivo para entrar.
        </div>
      ) : (
        <form onSubmit={entrar} className="card space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-400">Seu e-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-brand"
            />
          </label>
          <button type="submit" className="btn-primary w-full">
            Receber link de acesso
          </button>
          {erro && <p className="text-sm text-red-400">{erro}</p>}
        </form>
      )}
    </div>
  );
}
