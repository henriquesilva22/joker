import Link from "next/link";
import { Aviso } from "@/components/Aviso";
import { AuthButton } from "@/components/AuthButton";
import { AdminLink } from "@/components/AdminLink";
import { LISTA_LOTERIAS } from "@/lib/lotteries";
import { formatarUmEm, chancePrincipal } from "@/lib/stats/probability";

// Dashboard - tela inicial.
export default function Dashboard() {
  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Sorte<span className="text-brand-light">IA</span>
          </h1>
          <p className="text-sm text-slate-400">
            Previsao estatistica com IA que aprende com os erros.
          </p>
        </div>
        <AuthButton />
      </header>

      <Aviso />

      <AdminLink />

      <Link href="/gerar" className="block">
        <div className="card flex items-center justify-between bg-brand/20">
          <div>
            <p className="text-lg font-bold">Gerar previsoes</p>
            <p className="text-xs text-slate-300">Escolha a loteria e o objetivo</p>
          </div>
          <span className="text-2xl">🎲</span>
        </div>
      </Link>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Loterias
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {LISTA_LOTERIAS.map((l) => {
            const chance = chancePrincipal(l, l.qtd_aposta_min);
            return (
              <Link key={l.id} href={`/gerar?loteria=${l.id}`} className="card">
                <p className="font-bold">{l.nome}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {l.qtd_sorteada} de {l.numero_max} numeros
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  Premio: {formatarUmEm(chance)}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Link href="/jogos" className="card text-center">
          <span className="text-2xl">🎟️</span>
          <p className="mt-1 text-xs font-semibold">Meus jogos</p>
        </Link>
        <Link href="/conferir" className="card text-center">
          <span className="text-2xl">🔎</span>
          <p className="mt-1 text-xs font-semibold">Conferidor</p>
        </Link>
        <Link href="/backtesting" className="card text-center">
          <span className="text-2xl">📊</span>
          <p className="mt-1 text-xs font-semibold">Backtesting</p>
        </Link>
      </section>
    </div>
  );
}
