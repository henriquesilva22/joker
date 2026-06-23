"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bolas } from "@/components/Bolas";
import { LoteriaSelect } from "@/components/LoteriaSelect";
import { getLoteria } from "@/lib/lotteries";
import type { LoteriaId } from "@/lib/types";

interface Ganhador {
  user_id: string;
  email?: string;
  jogo: number[];
  acertos: number;
  numeros_acertados: number[];
}
interface Resumo {
  concurso: number;
  loteria_nome: string;
  numeros_sorteados: number[];
  previsoes_conferidas: number;
  jogos_premiados: number;
  melhor_acerto: number;
  ganhadores: Ganhador[];
}

type Estado = "carregando" | "negado" | "anon" | "ok";

export default function AdminResultadosPage() {
  const [estado, setEstado] = useState<Estado>("carregando");

  const [loteriaId, setLoteriaId] = useState<LoteriaId>("megasena");
  const loteria = getLoteria(loteriaId);

  const [concurso, setConcurso] = useState("");
  const [data, setData] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resumo, setResumo] = useState<Resumo | null>(null);

  useEffect(() => {
    fetch("/api/admin/resultados").then((r) => {
      if (r.status === 401) setEstado("anon");
      else if (r.status === 403) setEstado("negado");
      else if (r.ok) setEstado("ok");
      else setEstado("negado");
    });
  }, []);

  const possiveis = Array.from(
    { length: loteria.numero_max - loteria.numero_min + 1 },
    (_, i) => loteria.numero_min + i,
  );
  const alvo = loteria.qtd_sorteada;

  function trocarLoteria(id: LoteriaId) {
    setLoteriaId(id);
    setSel([]);
    setResumo(null);
    setErro("");
  }

  function toggle(n: number) {
    setResumo(null);
    setSel((atual) =>
      atual.includes(n)
        ? atual.filter((x) => x !== n)
        : atual.length < alvo
          ? [...atual, n]
          : atual,
    );
  }

  async function salvar() {
    setErro("");
    setResumo(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/admin/resultados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loteria: loteriaId,
          numero_concurso: Number(concurso),
          data_sorteio: data,
          numeros_sorteados: sel,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Erro ao cadastrar");
      setResumo(d);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (estado === "carregando") return <p className="text-slate-400">Carregando...</p>;
  if (estado === "anon")
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-slate-300">Faca login para continuar.</p>
        <Link href="/login" className="btn-primary inline-block">Entrar</Link>
      </div>
    );
  if (estado === "negado")
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Acesso negado</h1>
        <p className="text-sm text-slate-300">
          Esta area e exclusiva para administradores.
        </p>
        <Link href="/" className="btn-ghost inline-block">Voltar ao inicio</Link>
      </div>
    );

  const valido =
    sel.length === alvo && Number(concurso) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(data);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cadastrar resultado</h1>
      <p className="text-sm text-slate-400">
        Informe o resultado oficial. O sistema confere automaticamente as
        previsoes salvas deste concurso.
      </p>

      <LoteriaSelect valor={loteriaId} onChange={trocarLoteria} />

      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-400">Numero do concurso</span>
            <input
              type="number"
              value={concurso}
              onChange={(e) => setConcurso(e.target.value)}
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-brand"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-400">Data do sorteio</span>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-brand"
            />
          </label>
        </div>

        <div>
          <p className="mb-1.5 text-xs text-slate-400">
            Numeros sorteados — {sel.length}/{alvo} ({loteria.numero_min}–{loteria.numero_max})
          </p>
          <div className="grid grid-cols-10 gap-1.5">
            {possiveis.map((n) => {
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
        </div>

        <button className="btn-primary w-full" onClick={salvar} disabled={!valido || enviando}>
          {enviando ? "Salvando e conferindo..." : "Cadastrar resultado"}
        </button>
        {erro && <p className="text-sm text-red-400">{erro}</p>}
      </div>

      {resumo && (
        <div className="space-y-3">
          <div className="card bg-brand/10 text-sm">
            <p className="font-semibold text-brand-light">
              ✅ Resultado cadastrado com sucesso.
            </p>
            <div className="mt-2">
              <Bolas numeros={resumo.numeros_sorteados} tamanho="sm" />
            </div>
            <div className="mt-3 space-y-1 text-slate-200">
              <p>Concurso: <strong>{resumo.concurso}</strong></p>
              <p>Loteria: <strong>{resumo.loteria_nome}</strong></p>
              <p>Previsoes conferidas: <strong>{resumo.previsoes_conferidas}</strong></p>
              <p>Jogos premiados: <strong>{resumo.jogos_premiados}</strong></p>
              <p>Melhor acerto: <strong>{resumo.melhor_acerto}</strong></p>
            </div>
          </div>

          {resumo.ganhadores.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Ganhadores
              </h2>
              {resumo.ganhadores.map((g, i) => (
                <div key={i} className="card space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="truncate">{g.email ?? g.user_id}</span>
                    <span className="rounded-full bg-brand/20 px-2 py-0.5 font-bold text-brand-light">
                      {g.acertos} acertos
                    </span>
                  </div>
                  <Bolas numeros={g.jogo} acertos={g.numeros_acertados} tamanho="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
