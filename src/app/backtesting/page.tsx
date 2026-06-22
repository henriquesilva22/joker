"use client";

import { useState } from "react";
import { Aviso } from "@/components/Aviso";
import { LoteriaSelect } from "@/components/LoteriaSelect";
import { ROTULO_ESTRATEGIA, faixaDezenas } from "@/lib/lotteries";
import type { Estrategia, LoteriaId } from "@/lib/types";

interface ResBacktest {
  estrategia: Estrategia;
  dezenas_apostadas: number;
  jogos_equivalentes: number;
  custo_por_concurso: number;
  media_acertos: number;
  melhor_resultado: number;
  lucro_simulado: number;
}
interface Recomendacao {
  dezenas: number;
  justificativa: string;
}

export default function BacktestingPage() {
  const [loteriaId, setLoteriaId] = useState<LoteriaId>("megasena");
  const faixa = faixaDezenas(loteriaId);
  const [dezenas, setDezenas] = useState(faixa.min);
  const [ranking, setRanking] = useState<ResBacktest[]>([]);
  const [recomendacao, setRecomendacao] = useState<Recomendacao | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  function trocarLoteria(id: LoteriaId) {
    setLoteriaId(id);
    setDezenas(faixaDezenas(id).min);
    setRanking([]);
    setRecomendacao(null);
  }

  async function rodar() {
    setCarregando(true);
    setErro("");
    setRanking([]);
    setRecomendacao(null);
    try {
      const r = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loteria: loteriaId, dezenas }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro");
      setRanking(data.ranking);
      setRecomendacao(data.recomendacao_adaptativa);
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
        Simula cada estrategia no historico real (walk-forward, sem ver o futuro).
      </p>
      <LoteriaSelect valor={loteriaId} onChange={trocarLoteria} />

      <div className="card">
        <p className="mb-1.5 text-xs font-medium text-slate-400">
          {faixa.fixo
            ? `Dezenas: ${faixa.min} (fixo)`
            : `Dezenas apostadas: ${dezenas} (${faixa.min}–${faixa.max})`}
        </p>
        {!faixa.fixo && (
          <input type="range" min={faixa.min} max={faixa.max} value={dezenas}
            onChange={(e) => setDezenas(Number(e.target.value))}
            className="w-full accent-brand" />
        )}
      </div>

      <button className="btn-primary w-full" onClick={rodar} disabled={carregando}>
        {carregando ? "Rodando simulacao..." : "Rodar backtest"}
      </button>
      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {ranking.map((r, i) => (
        <div key={r.estrategia} className="card">
          <p className="font-bold">
            {i === 0 && "🥇 "}
            {ROTULO_ESTRATEGIA[r.estrategia]}
          </p>
          <div className="mt-2 space-y-1 text-xs text-slate-300">
            <p>Dezenas apostadas: <strong>{r.dezenas_apostadas}</strong></p>
            <p>Jogos equivalentes: <strong>{r.jogos_equivalentes.toLocaleString("pt-BR")}</strong></p>
            <p>Custo por concurso: <strong>R$ {r.custo_por_concurso.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
            <p>Melhor: <strong>{r.melhor_resultado}</strong></p>
            <p>Media de acertos: <strong>{r.media_acertos}</strong></p>
            <p className={r.lucro_simulado >= 0 ? "text-brand-light" : "text-red-400"}>
              Lucro simulado: <strong>R$ {r.lucro_simulado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </p>
          </div>
        </div>
      ))}

      {recomendacao && (
        <div className="card bg-brand/15 text-center">
          <p className="text-xs uppercase tracking-wide text-slate-400">IA Adaptativa</p>
          <p className="mt-1 text-lg font-bold text-brand-light">
            Recomendacao: {recomendacao.dezenas} dezenas ⭐
          </p>
          <p className="mt-2 text-sm text-slate-200">Justificativa: {recomendacao.justificativa}</p>
        </div>
      )}

      {ranking.length > 0 && <Aviso compacto />}
    </div>
  );
}
