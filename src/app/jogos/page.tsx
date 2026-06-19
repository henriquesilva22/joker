"use client";

import { useEffect, useState } from "react";
import { Bolas } from "@/components/Bolas";
import { ROTULO_ESTRATEGIA } from "@/lib/lotteries";

interface ResultadoPrev {
  resultado_real: number[];
  acertos_por_jogo: number[];
  melhor_acerto: number;
  ganhou: boolean;
  explicacao_ia: string | null;
  ajuste_sugerido: Record<string, number>;
}
interface Previsao {
  id: string;
  loteria_id: string;
  concurso_previsto: number;
  jogos_gerados: number[][];
  estrategia: keyof typeof ROTULO_ESTRATEGIA;
  criado_em: string;
  resultados_previsoes: ResultadoPrev[];
}

export default function JogosPage() {
  const [previsoes, setPrevisoes] = useState<Previsao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [conferindo, setConferindo] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    const r = await fetch("/api/previsoes");
    if (r.status === 401) {
      setErro("Faca login para ver e salvar seus jogos.");
      setCarregando(false);
      return;
    }
    const data = await r.json();
    setPrevisoes(data.previsoes ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function conferir(id: string) {
    setConferindo(id);
    setErro("");
    const r = await fetch("/api/conferir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ previsaoId: id }),
    });
    const data = await r.json();
    if (!r.ok) setErro(data.error ?? "Erro ao conferir");
    else await carregar();
    setConferindo(null);
  }

  if (carregando) return <p className="text-slate-400">Carregando...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Meus jogos</h1>
      {erro && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{erro}</p>}
      {!previsoes.length && !erro && (
        <p className="text-sm text-slate-400">
          Nenhuma previsao salva ainda. Gere e salve jogos na aba Gerar.
        </p>
      )}

      {previsoes.map((p) => {
        const res = p.resultados_previsoes?.[0];
        return (
          <div key={p.id} className="card space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase">{p.loteria_id}</span>
              <span>
                Conc. {p.concurso_previsto} · {ROTULO_ESTRATEGIA[p.estrategia]}
              </span>
            </div>

            {p.jogos_gerados.map((jogo, i) => (
              <div key={i} className="space-y-1">
                <Bolas numeros={jogo} acertos={res?.resultado_real ?? []} tamanho="sm" />
                {res && (
                  <p className="text-[11px] text-slate-400">
                    {res.acertos_por_jogo[i]} acertos
                  </p>
                )}
              </div>
            ))}

            {!res ? (
              <button
                className="btn-ghost w-full text-sm"
                onClick={() => conferir(p.id)}
                disabled={conferindo === p.id}
              >
                {conferindo === p.id ? "Conferindo..." : "Conferir resultado"}
              </button>
            ) : (
              <div className="space-y-2 rounded-xl bg-black/20 p-3">
                <p className="text-sm">
                  {res.ganhou ? "🏆 Premiado!" : "Sem premio"} · melhor jogo:{" "}
                  <strong>{res.melhor_acerto} acertos</strong>
                </p>
                <div>
                  <p className="text-[11px] uppercase text-slate-500">Resultado real</p>
                  <Bolas numeros={res.resultado_real} tamanho="sm" />
                </div>
                {res.explicacao_ia && (
                  <p className="rounded-lg bg-brand/10 p-2 text-xs text-slate-200">
                    🤖 {res.explicacao_ia}
                  </p>
                )}
                {res.ajuste_sugerido && Object.keys(res.ajuste_sugerido).length > 0 && (
                  <p className="text-[11px] text-slate-400">
                    Ajuste de pesos:{" "}
                    {Object.entries(res.ajuste_sugerido)
                      .map(([k, v]) => `${k.replace("peso_", "")} ${v > 0 ? "+" : ""}${v}`)
                      .join(" · ")}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
