"use client";

import { useState } from "react";
import { Aviso } from "@/components/Aviso";
import { Bolas } from "@/components/Bolas";

interface Premiacao {
  numero_concurso: number;
  data_sorteio: string;
  numeros_sorteados: number[];
  acertados: number[];
  acertos: number;
  premiado: boolean;
}
interface Resposta {
  jogo: number[];
  total_concursos: number;
  total_premiacoes: number;
  melhor_acerto: number;
  resumo: Record<string, number>;
  premiacoes: Premiacao[];
}

const TOTAL = 15;
const DEZENAS = Array.from({ length: 25 }, (_, i) => i + 1);

export default function ConferirPage() {
  const [sel, setSel] = useState<number[]>([]);
  const [resp, setResp] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  function toggle(n: number) {
    setResp(null);
    setErro("");
    setSel((atual) =>
      atual.includes(n)
        ? atual.filter((x) => x !== n)
        : atual.length < TOTAL
          ? [...atual, n]
          : atual,
    );
  }

  async function conferir() {
    setErro("");
    setResp(null);
    setCarregando(true);
    try {
      const r = await fetch("/api/conferir-historico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeros: sel }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao conferir");
      setResp(data);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Conferidor Historico</h1>
        <p className="text-sm text-slate-400">
          Escolha 15 dezenas e veja em quais concursos da Lotofacil esse jogo
          teria feito 11+ acertos.
        </p>
      </header>

      <div className="card space-y-3">
        <div className="grid grid-cols-5 gap-2">
          {DEZENAS.map((n) => {
            const ativo = sel.includes(n);
            const cheio = sel.length >= TOTAL && !ativo;
            return (
              <button
                key={n}
                onClick={() => toggle(n)}
                disabled={cheio}
                className={`aspect-square rounded-full text-sm font-bold transition ${
                  ativo
                    ? "bg-brand text-white"
                    : cheio
                      ? "bg-white/5 text-slate-600"
                      : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
              >
                {String(n).padStart(2, "0")}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className={sel.length === TOTAL ? "text-brand-light" : "text-slate-400"}>
            {sel.length}/{TOTAL} selecionados
          </span>
          {sel.length > 0 && (
            <button onClick={() => setSel([])} className="text-xs text-slate-400 hover:text-slate-200">
              Limpar
            </button>
          )}
        </div>

        <button
          className="btn-primary w-full"
          onClick={conferir}
          disabled={sel.length !== TOTAL || carregando}
        >
          {carregando ? "Conferindo..." : "Conferir historico"}
        </button>
        {erro && <p className="text-sm text-red-400">{erro}</p>}
      </div>

      {resp && (
        <div className="space-y-3">
          <div className="card bg-brand/10 text-sm">
            <p>
              Comparado com <strong>{resp.total_concursos}</strong> concursos.
            </p>
            {resp.total_premiacoes > 0 ? (
              <p className="mt-1">
                🏆 Teria sido premiado <strong>{resp.total_premiacoes}</strong> vez(es) ·
                melhor: <strong>{resp.melhor_acerto} acertos</strong>
              </p>
            ) : null}
            {resp.total_premiacoes > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                {[15, 14, 13, 12, 11].map((f) =>
                  resp.resumo[f] ? (
                    <span key={f} className="rounded-full bg-white/10 px-2 py-0.5">
                      {f} acertos: {resp.resumo[f]}x
                    </span>
                  ) : null,
                )}
              </div>
            )}
          </div>

          {resp.total_premiacoes === 0 && (
            <div className="card text-center text-sm text-slate-300">
              😕 Esse jogo nao teria feito nenhum premio (11+ acertos) em nenhum
              concurso salvo. Loteria e aleatoria — tente outra combinacao.
            </div>
          )}

          {resp.premiacoes.map((p) => (
            <div key={p.numero_concurso} className="card space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Concurso <strong className="text-slate-200">{p.numero_concurso}</strong> ·{" "}
                  {formatarData(p.data_sorteio)}
                </span>
                <span className="rounded-full bg-brand/20 px-2 py-0.5 font-bold text-brand-light">
                  {p.acertos} acertos
                </span>
              </div>
              <Bolas numeros={p.numeros_sorteados} acertos={p.acertados} tamanho="sm" />
            </div>
          ))}
        </div>
      )}

      <Aviso compacto />
    </div>
  );
}

function formatarData(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
