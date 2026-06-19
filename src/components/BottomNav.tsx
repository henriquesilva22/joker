"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/gerar", label: "Gerar", icon: "🎲" },
  { href: "/jogos", label: "Jogos", icon: "🎟️" },
  { href: "/backtesting", label: "Testes", icon: "📊" },
  { href: "/config", label: "IA", icon: "⚙️" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-ink/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {ITENS.map((it) => {
          const ativo = path === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                ativo ? "text-brand-light" : "text-slate-400"
              }`}
            >
              <span className="text-lg">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
