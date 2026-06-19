"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Aviso } from "@/components/Aviso";
import { Bolas } from "@/components/Bolas";
import { LoteriaSelect } from "@/components/LoteriaSelect";
import { getLoteria, ROTULO_ESTRATEGIA } from "@/lib/lotteries";
import type { Estrategia, LoteriaId, Objetivo } from "@/lib/types";

interface RespostaGerar {
  concurso_previsto: number;
  estrategia: Estrategia;
  objetivo: Objetivo;
  jogos: { numeros: number[]; soma: number; pares: number; distribuicao: number[] }[];
  chance: { por_jogo: string; combinada: string; aviso: string };
  pesos_usados: Record<string, number>;
}

const ESTRATEGIAS: Estrategia[] = ["conservador", "equilibrado", "agressivo", "adaptativo"];

function GerarInner() {
  const params = useSearchParams();
  const inicial = (params.get("loteria") as LoteriaId) ?? "megasena";

  const [loteriaId, setLoteriaId] = useState<LoteriaId>(inicial);
  const loteria = getLoteria(loteriaId);

  const [qtdJogos, setQtdJogos] = useState(5);
  const [dezenas, setDezenas] = useState(loteria.qtd_aposta_min);
  const [estrategia, setEstrategia] = useState<Estrategia>("equilibrado");
  const [objetivo, setObjetivo] = useState<Objetivo>("principal");

  const [resp, setResp] = useState<RespostaGerar | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);

  function trocarLoteria(id: LoteriaId) {
    setLoteriaId(id);
    setDezenas(getLoteria(id).qtd_aposta_min);
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

        <Campo label={`Dezenas por jogo: ${dezenas}`}>
          <input type="range" min={loteria.qtd_aposta_min} max={loteria.qtd_aposta_max}
            value={dezenas} onChange={(e) => setDezenas(Number(e.target.value))}
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

        <button className="btn-primary w-full" onClick={gerar} disabled={carregando}>
          {carregando ? "Gerando..." : "Gerar jogos"}
        </button>
        {erro && <p className="text-sm text-red-400">{erro}</p>}
      </div>

      {resp && (
        <div className="space-y-3">
          <div className="card bg-brand/10 text-sm">
            <p className="font-semibold">Concurso previsto: {resp.concurso_previsto}</p>
            <p className="text-slate-300">Chance por jogo: {resp.chance.por_jogo}</p>
            <p className="text-slate-300">Chance combinada ({qtdJogos} jogos): {resp.chance.combinada}</p>
          </div>

          {resp.jogos.map((j, i) => (
            <div key={i} className="card space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Jogo {i + 1}</span>
                <span>soma {j.soma} · {j.pares} pares · {j.distribuicao.join("-")}</span>
              </div>
              <Bolas numeros={j.numeros} />
            </div>
          ))}

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
