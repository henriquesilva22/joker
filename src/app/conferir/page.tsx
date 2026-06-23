"use client";

import { useState } from "react";
import { Aviso } from "@/components/Aviso";
import { Bolas } from "@/components/Bolas";
import { LoteriaSelect } from "@/components/LoteriaSelect";
import { PasteNumbers } from "@/components/PasteNumbers";
import { getLoteria, faixaDezenas } from "@/lib/lotteries";
import type { LoteriaId } from "@/lib/types";

interface Premiacao {
  numero_concurso: number;
  data_sorteio: string;
  numeros_sorteados: number[];
  acertados: number[];
  acertos: number;
}
interface Resposta {
  concursos_analisados: number;
  maior_acerto: number;
  concursos_premiados: number;
  premiacoes: Premiacao[];
}

export default function ConferirPage() {
  const [loteriaId, setLoteriaId] = useState<LoteriaId>("megasena");
  const loteria = getLoteria(loteriaId);
  const faixa = faixaDezenas(loteriaId);

  const [alvo, setAlvo] = useState(faixa.min);
  const [sel, setSel] = useState<number[]>([]);
  const [resp, setResp] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  // Lista de dezenas possiveis da loteria (numero_min..numero_max).
  const dezenasPossiveis = Array.from(
    { length: loteria.numero_max - loteria.numero_min + 1 },
    (_, i) => loteria.numero_min + i,
  );

  function trocarLoteria(id: LoteriaId) {
    setLoteriaId(id);
    setAlvo(faixaDezenas(id).min);
    setSel([]);
    setResp(null);
    setErro("");
  }

  function mudarAlvo(novo: number) {
    setAlvo(novo);
    setSel((atual) => (atual.length > novo ? atual.slice(0, novo) : atual));
    setResp(null);
  }

  function toggle(n: number) {
    setResp(null);
    setErro("");
    setSel((atual) =>
      atual.includes(n)
        ? atual.filter((x) => x !== n)
        : atual.length < alvo
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
        body: JSON.stringify({ loteria: loteriaId, numeros: sel }),
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
          Escolha suas dezenas e veja em quais concursos da {loteria.nome} esse
          jogo teria sido premiado.
        </p>
      </header>

      <LoteriaSelect valor={loteriaId} onChange={trocarLoteria} />

      <div className="card space-y-3">
        {/* Quantidade de dezenas (adapta a loteria) */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-400">
            {faixa.fixo
              ? `Quantidade de dezenas: ${faixa.min} (fixo)`
              : `Quantidade de dezenas: ${alvo} (${faixa.min}–${faixa.max})`}
          </p>
          {!faixa.fixo && (
            <input
              type="range"
              min={faixa.min}
              max={faixa.max}
              value={alvo}
              onChange={(e) => mudarAlvo(Number(e.target.value))}
              className="w-full accent-brand"
            />
          )}
        </div>

        {/* Grade de dezenas */}
        <div className="grid grid-cols-10 gap-1.5">
          {dezenasPossiveis.map((n) => {
            const ativo = sel.includes(n);
            const cheio = sel.length >= alvo && !ativo;
            return (
              <button
                key={n}
                onClick={() => toggle(n)}
                disabled={cheio}
                className={`aspect-square rounded-md text-xs font-bold transition ${
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
          <span className={sel.length === alvo ? "text-brand-light" : "text-slate-400"}>
            {sel.length}/{alvo} selecionados
          </span>
          <div className="flex items-center gap-3">
            <PasteNumbers
              min={loteria.numero_min}
              max={loteria.numero_max}
              esperado={alvo}
              onApply={(nums) => {
                setSel(nums);
                setResp(null);
                setErro("");
              }}
            />
            {sel.length > 0 && (
              <button onClick={() => setSel([])} className="text-xs text-slate-400 hover:text-slate-200">
                Limpar
              </button>
            )}
          </div>
        </div>

        <button
          className="btn-primary w-full"
          onClick={conferir}
          disabled={sel.length !== alvo || carregando}
        >
          {carregando ? "Conferindo..." : "Conferir historico"}
        </button>
        {erro && <p className="text-sm text-red-400">{erro}</p>}
      </div>

      {resp && (
        <div className="space-y-3">
          {/* Estatistica final (apenas 3 numeros) */}
          <div className="card grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-extrabold">{resp.concursos_analisados}</p>
              <p className="text-[11px] text-slate-400">Concursos analisados</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold">{resp.maior_acerto}</p>
              <p className="text-[11px] text-slate-400">Maior nº de acertos</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-brand-light">
                {resp.concursos_premiados}
              </p>
              <p className="text-[11px] text-slate-400">Concursos premiados</p>
            </div>
          </div>

          {resp.concursos_premiados === 0 && (
            <div className="card text-center text-sm text-slate-300">
              😕 Esse jogo nao teria sido premiado em nenhum concurso salvo da{" "}
              {loteria.nome}. Loteria e aleatoria — tente outra combinacao.
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
              <p className="text-[11px] text-brand-light">✓ Teria sido premiado</p>
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
