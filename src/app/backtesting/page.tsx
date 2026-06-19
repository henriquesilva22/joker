"use client";

import { useState } from "react";
import { Aviso } from "@/components/Aviso";
import { LoteriaSelect } from "@/components/LoteriaSelect";
import { ROTULO_ESTRATEGIA } from "@/lib/lotteries";
import type { Estrategia, LoteriaId } from "@/lib/types";

interface ResBacktest {
  estrategia: Estrategia;
  concursos_testados: number;
  media_acertos: number;
  melhor_resultado: number;
  pior_resultado: number;
  lucro_simulado: number;
  score: number;
}

export default function BacktestingPage() {
  const [loteriaId, setLoteriaId] = useState<LoteriaId>("megasena");
  const [ranking, setRanking] = useState<ResBacktest[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function rodar() {
    setCarregando(true);
    setErro("");
    setRanking([]);
    try {
      const r = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loteria: loteriaId, todas: true }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro");
      setRanking(data.ranking);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Backtesting</h1>
      <p className="text-sm text-slate-400">
        Simula cada estrategia no historico real (walk-forward, sem ver o futuro)
        e ranqueia por desempenho.
      </p>
      <LoteriaSelect valor={loteriaId} onChange={setLoteriaId} />
      <button className="btn-primary w-full" onClick={rodar} disabled={carregando}>
        {carregando ? "Rodando simulacao..." : "Rodar backtest de todas as estrategias"}
      </button>
      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {ranking.map((r, i) => (
        <div key={r.estrategia} className="card">
          <div className="flex items-center justify-between">
            <span className="font-bold">
              {i === 0 && "🥇 "}
              {ROTULO_ESTRATEGIA[r.estrategia]}
            </span>
            <span className="text-sm text-brand-light">score {r.score}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs text-slate-300">
            <span>Media de acertos: <strong>{r.media_acertos}</strong></span>
            <span>Melhor: <strong>{r.melhor_resultado}</strong></span>
            <span>Concursos: {r.concursos_testados}</span>
            <span className={r.lucro_simulado >= 0 ? "text-brand-light" : "text-red-400"}>
              Lucro sim.: R$ {r.lucro_simulado.toLocaleString("pt-BR")}
            </span>
          </div>
        </div>
      ))}

      {ranking.length > 0 && <Aviso compacto />}
    </div>
  );
}
