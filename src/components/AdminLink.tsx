"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Mostra o atalho para a area administrativa SOMENTE se o usuario for admin.
// A verificacao real acontece no backend (/api/admin/resultados).
export function AdminLink() {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/admin/resultados")
      .then((r) => setAdmin(r.ok))
      .catch(() => setAdmin(false));
  }, []);

  if (!admin) return null;

  return (
    <Link href="/admin/resultados" className="block">
      <div className="card flex items-center justify-between bg-amber-500/10 border-amber-500/30">
        <div>
          <p className="text-lg font-bold">Area do administrador</p>
          <p className="text-xs text-slate-300">Cadastrar resultado e conferir jogos</p>
        </div>
        <span className="text-2xl">🛠️</span>
      </div>
    </Link>
  );
}
