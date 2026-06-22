"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Aviso } from "@/components/Aviso";
import { Bolas } from "@/components/Bolas";
import { LoteriaSelect } from "@/components/LoteriaSelect";
import { getLoteria, ROTULO_ESTRATEGIA, faixaDezenas } from "@/lib/lotteries";
import type { Estrategia, LoteriaId, Objetivo } from "@/lib/types";

interface QualidadeJogo {
  total: number;
  estrutura: number;
  tendencia: number;
  cobertura: number;
}
interface Similar {
  numero_concurso: number;
  similaridade: number;
}
interface RespostaGerar {
  concurso_previsto: number;
  estrategia: Estrategia;
  objetivo: Objetivo;
  jogos: { numeros: number[]; soma: number; pares: number; distribuicao: number[] }[];
  qualidade: {
    total: number;
    media_qualidade: number;
    diversidade: number;
    por_jogo: QualidadeJogo[];
  };
  similares: Similar[][];
  chance: { por_jogo: string; combinada: string; aviso: string };
  pesos_usados: Record<string, number>;
}

function corQualidade(n: number): string {
  if (n >= 75) return "text-brand-light";
  if (n >= 50) return "text-amber-300";
  return "text-red-400";
}

const ESTRATEGIAS: Estrategia[] = ["conservador", "equilibrado", "agressivo", "adaptativo"];

function GerarInner() {
  const params = useSearchParams();
  const inicial = (params.get("loteria") as LoteriaId) ?? "megasena";

  const [loteriaId, setLoteriaId] = useState<LoteriaId>(inicial);
  const loteria = getLoteria(loteriaId);

  const faixa = faixaDezenas(loteriaId);
  const [qtdJogos, setQtdJogos] = useState(5);
  const [dezenas, setDezenas] = useState(faixa.min);
  const [estrategia, setEstrategia] = useState<Estrategia>("equilibrado");
  const [objetivo, setObjetivo] = useState<Objetivo>("principal");

  const [resp, setResp] = useState<RespostaGerar | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);

  function trocarLoteria(id: LoteriaId) {
    setLoteriaId(id);
    setDezenas(faixaDezenas(id).min);
    setResp(null);
    setSalvo(false);
  }

  async function gerar() {
    setCarregando(true);
    setErro("");
    setSalvo(false);
    try {
      const r = await fetch("/api/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loteria: loteriaId, qtdJogos, dezenas, estrategia, objetivo }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao gerar");
      setResp(data);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  async function salvar() {
    if (!resp) return;
    const r = await fetch("/api/previsoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loteria: loteriaId,
        concurso_previsto: resp.concurso_previsto,
        jogos: resp.jogos.map((j) => j.numeros),
        estrategia: resp.estrategia,
        objetivo: resp.objetivo,
        pesos_usados: resp.pesos_usados,
      }),
    });
    if (r.ok) setSalvo(true);
    else if (r.status === 401) setErro("Faca login para salvar os jogos.");
    else setErro("Nao foi possivel salvar.");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gerar previsoes</h1>
      <LoteriaSelect valor={loteriaId} onChange={trocarLoteria} />
      <Aviso compacto />

      <div className="card space-y-4">
        <Campo label={`Quantidade de jogos: ${qtdJogos}`}>
          <input type="range" min={1} max={50} value={qtdJogos}
            onChange={(e) => setQtdJogos(Number(e.target.value))}
            className="w-full accent-brand" />
        </Campo>

        <Campo label="Objetivo">
          <div className="grid grid-cols-2 gap-2">
            {(["principal", "parciais"] as Objetivo[]).map((o) => (
              <button key={o} onClick={() => setObjetivo(o)}
                className={`rounded-lg py-2 text-sm font-semibold ${
                  objetivo === o ? "bg-brand text-white" : "bg-white/5 text-slate-300"
                }`}>
                {o === "principal" ? "Premio principal" : "Acertos parciais"}
              </button>
            ))}
          </div>
        </Campo>

        <Campo label="Estrategia da IA">
          <div className="grid grid-cols-2 gap-2">
            {ESTRATEGIAS.map((e) => (
              <button key={e} onClick={() => setEstrategia(e)}
                className={`rounded-lg py-2 text-sm font-semibold ${
                  estrategia === e ? "bg-brand text-white" : "bg-white/5 text-slate-300"
                }`}>
                {ROTULO_ESTRATEGIA[e]}
              </button>
            ))}
          </div>
        </Campo>

        <Campo
          label={
            faixa.fixo
              ? `Quantidade de dezenas: ${faixa.min} (fixo)`
              : `Quantidade de dezenas: ${dezenas} (${faixa.min}–${faixa.max})`
          }
        >
          {faixa.fixo ? (
            <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300">
              Esta loteria usa sempre {faixa.min} dezenas.
            </p>
          ) : (
            <input type="range" min={faixa.min} max={faixa.max}
              value={dezenas} onChange={(e) => setDezenas(Number(e.target.value))}
              className="w-full accent-brand" />
          )}
        </Campo>

        <button className="btn-primary w-full" onClick={gerar} disabled={carregando}>
          {carregando ? "Gerando..." : "Gerar jogos"}
        </button>
        {erro && <p className="text-sm text-red-400">{erro}</p>}
      </div>

      {resp && (
        <div className="space-y-3">
          <div className="card bg-brand/10">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Qualidade do conjunto
                </p>
                <p className={`text-4xl font-extrabold ${corQualidade(resp.qualidade.total)}`}>
                  {resp.qualidade.total}
                  <span className="text-lg text-slate-500">/100</span>
                </p>
              </div>
              <div className="text-right text-xs text-slate-300">
                <p>Concurso previsto: {resp.concurso_previsto}</p>
                <p>Diversidade: {resp.qualidade.diversidade}/100</p>
                <p>Chance: {resp.chance.por_jogo}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Nota baseada em estrutura, tendencia, cobertura e diversidade — nao e
              chance de ganhar.
            </p>
          </div>

          {resp.jogos.map((j, i) => {
            const q = resp.qualidade.por_jogo[i];
            const sim = resp.similares?.[i] ?? [];
            return (
              <div key={i} className="card space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Jogo {i + 1}</span>
                  <span className={`font-bold ${corQualidade(q?.total ?? 0)}`}>
                    {q?.total ?? 0}/100
                  </span>
                </div>
                <Bolas numeros={j.numeros} />
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                  <span>soma {j.soma}</span>
                  <span>{j.pares} pares</span>
                  <span>faixas {j.distribuicao.join("-")}</span>
                  <span>estrut. {q?.estrutura}</span>
                  <span>tend. {q?.tendencia}</span>
                  <span>cobert. {q?.cobertura}</span>
                </div>
                {sim.length > 0 && (
                  <p className="text-[11px] text-slate-400">
                    🔁 parecido com{" "}
                    {sim
                      .map((s) => `conc. ${s.numero_concurso} (${s.similaridade}%)`)
                      .join(" · ")}
                  </p>
                )}
              </div>
            );
          })}

          <button className="btn-ghost w-full" onClick={salvar} disabled={salvo}>
            {salvo ? "✅ Jogos salvos" : "Salvar previsao"}
          </button>
        </div>
      )}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export default function GerarPage() {
  return (
    <Suspense fallback={<p className="text-slate-400">Carregando...</p>}>
      <GerarInner />
    </Suspense>
  );
}
