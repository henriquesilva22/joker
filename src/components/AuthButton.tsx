"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Mostra o e-mail logado + botao de sair, ou um link para entrar.
export function AuthButton() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setCarregando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setEmail(null);
    router.replace("/");
    router.refresh();
  }

  if (carregando) return null;

  if (!email) {
    return (
      <Link href="/login" className="text-sm font-semibold text-brand-light">
        Entrar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[140px] truncate text-xs text-slate-400">{email}</span>
      <button onClick={sair} className="btn-ghost px-3 py-1.5 text-xs">
        Sair
      </button>
    </div>
  );
}
