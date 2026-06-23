"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bolas } from "@/components/Bolas";
import { LoteriaSelect } from "@/components/LoteriaSelect";
import { PasteNumbers } from "@/components/PasteNumbers";
import { getLoteria } from "@/lib/lotteries";
import { createClient } from "@/lib/supabase/client";
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
interface Proximo {
  loteria_id: string;
  numero_concurso: number;
  data_sorteio: string | null;
  premio_estimado: number | null;
}
interface UltimoConcurso {
  numero_concurso: number;
  data_sorteio: string;
  numeros_sorteados: number[];
}

type Estado = "carregando" | "negado" | "anon" | "ok";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBR = (iso?: string | null) => {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

export default function AdminResultadosPage() {
  const [estado, setEstado] = useState<Estado>("carregando");

  const [loteriaId, setLoteriaId] = useState<LoteriaId>("megasena");
  const loteria = getLoteria(loteriaId);

  // cadastro de resultado
  const [concurso, setConcurso] = useState("");
  const [data, setData] = useState("");
  const [premio, setPremio] = useState("");
  const [acumulado, setAcumulado] = useState(false);
  const [sel, setSel] = useState<number[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [perguntarProx, setPerguntarProx] = useState(false);

  // proximo concurso
  const [proximos, setProximos] = useState<Proximo[]>([]);
  const [editProx, setEditProx] = useState(false);
  const [proxNum, setProxNum] = useState("");
  const [proxData, setProxData] = useState("");
  const [proxPremio, setProxPremio] = useState("");
  const [salvandoProx, setSalvandoProx] = useState(false);
  const [erroProx, setErroProx] = useState("");

  // ultimos resultados
  const [ultimos, setUltimos] = useState<UltimoConcurso[]>([]);

  const proximoAtual = proximos.find((p) => p.loteria_id === loteriaId) ?? null;

  const carregarProximos = useCallback(async () => {
    const r = await fetch("/api/admin/proximo-concurso");
    if (r.ok) setProximos((await r.json()).proximos ?? []);
  }, []);

  const carregarUltimos = useCallback(async (id: LoteriaId) => {
    const sb = createClient();
    const { data } = await sb
      .from("concursos")
      .select("numero_concurso, data_sorteio, numeros_sorteados")
      .eq("loteria_id", id)
      .order("numero_concurso", { ascending: false })
      .limit(6);
    setUltimos((data ?? []) as UltimoConcurso[]);
  }, []);

  useEffect(() => {
    fetch("/api/admin/resultados").then(async (r) => {
      if (r.status === 401) setEstado("anon");
      else if (r.status === 403) setEstado("negado");
      else if (r.ok) {
        setEstado("ok");
        carregarProximos();
        carregarUltimos(loteriaId);
      } else setEstado("negado");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setPerguntarProx(false);
    setEditProx(false);
    carregarUltimos(id);
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
    setPerguntarProx(false);
    setEnviando(true);
    try {
      const r = await fetch("/api/admin/resultados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loteria: loteriaId,
          numero_concurso: Number(concurso),
          data_sorteio: data,
          premio: premio === "" ? null : Number(premio),
          acumulado,
          numeros_sorteados: sel,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Erro ao cadastrar");
      setResumo(d);
      setPerguntarProx(true);
      carregarUltimos(loteriaId);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  function abrirEditarProximo(prefill?: { numero?: number }) {
    setErroProx("");
    setProxNum(String(prefill?.numero ?? proximoAtual?.numero_concurso ?? ""));
    setProxData(prefill ? "" : proximoAtual?.data_sorteio ?? "");
    setProxPremio(
      prefill ? "" : proximoAtual?.premio_estimado != null ? String(proximoAtual.premio_estimado) : "",
    );
    setEditProx(true);
    setPerguntarProx(false);
  }

  async function salvarProximo() {
    setErroProx("");
    setSalvandoProx(true);
    try {
      const r = await fetch("/api/admin/proximo-concurso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loteria: loteriaId,
          numero_concurso: Number(proxNum),
          data_sorteio: proxData || null,
          premio_estimado: proxPremio === "" ? null : Number(proxPremio),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Erro");
      await carregarProximos();
      setEditProx(false);
    } catch (e: any) {
      setErroProx(e.message);
    } finally {
      setSalvandoProx(false);
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
        <p className="text-sm text-slate-300">Esta area e exclusiva para administradores.</p>
        <Link href="/" className="btn-ghost inline-block">Voltar ao inicio</Link>
      </div>
    );

  const valido =
    sel.length === alvo && Number(concurso) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(data);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Area do administrador</h1>
      <LoteriaSelect valor={loteriaId} onChange={trocarLoteria} />

      {/* ---------- PROXIMO CONCURSO ---------- */}
      <section className="card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Proximo concurso
          </h2>
          <button onClick={() => abrirEditarProximo()} className="btn-ghost px-3 py-1 text-xs">
            Editar
          </button>
        </div>
        {proximoAtual ? (
          <div className="text-sm text-slate-200">
            <p>Loteria: <strong>{loteria.nome}</strong></p>
            <p>Concurso: <strong>{proximoAtual.numero_concurso}</strong></p>
            <p>Data: <strong>{dataBR(proximoAtual.data_sorteio)}</strong></p>
            <p>
              Premio estimado:{" "}
              <strong>
                {proximoAtual.premio_estimado != null
                  ? `R$ ${brl(proximoAtual.premio_estimado)}`
                  : "—"}
              </strong>
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Nenhum proximo concurso cadastrado.</p>
        )}

        {editProx && (
          <div className="mt-2 space-y-2 rounded-xl bg-black/20 p-3">
            <div className="grid grid-cols-3 gap-2">
              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">Concurso</span>
                <input type="number" value={proxNum} onChange={(e) => setProxNum(e.target.value)}
                  className="w-full rounded-lg bg-white/5 px-2 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-brand" />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">Data</span>
                <input type="date" value={proxData} onChange={(e) => setProxData(e.target.value)}
                  className="w-full rounded-lg bg-white/5 px-2 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-brand" />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">Premio R$</span>
                <input type="number" min={0} step="0.01" value={proxPremio} onChange={(e) => setProxPremio(e.target.value)}
                  className="w-full rounded-lg bg-white/5 px-2 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-brand" />
              </label>
            </div>
            {erroProx && <p className="text-xs text-red-400">{erroProx}</p>}
            <div className="flex gap-2">
              <button onClick={() => setEditProx(false)} className="btn-ghost flex-1 text-sm">Cancelar</button>
              <button onClick={salvarProximo} disabled={salvandoProx || Number(proxNum) <= 0}
                className="btn-primary flex-1 text-sm">
                {salvandoProx ? "Salvando..." : "Salvar proximo"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ---------- CADASTRAR RESULTADO ---------- */}
      <section className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Cadastrar resultado
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-400">Numero do concurso</span>
            <input type="number" value={concurso} onChange={(e) => setConcurso(e.target.value)}
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-brand" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-400">Data do sorteio</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)}
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-brand" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-400">Valor do premio (R$)</span>
            <input type="number" min={0} step="0.01" value={premio} onChange={(e) => setPremio(e.target.value)}
              placeholder="opcional"
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-brand" />
          </label>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-slate-300">
            <input type="checkbox" checked={acumulado} onChange={(e) => setAcumulado(e.target.checked)}
              className="h-4 w-4 accent-brand" />
            Acumulou
          </label>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Numeros sorteados — {sel.length}/{alvo} ({loteria.numero_min}–{loteria.numero_max})
            </p>
            <PasteNumbers
              min={loteria.numero_min}
              max={loteria.numero_max}
              esperado={alvo}
              onApply={(nums) => {
                setSel(nums);
                setResumo(null);
              }}
            />
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {possiveis.map((n) => {
              const ativo = sel.includes(n);
              const cheio = sel.length >= alvo && !ativo;
              return (
                <button key={n} onClick={() => toggle(n)} disabled={cheio}
                  className={`aspect-square rounded-md text-xs font-bold transition ${
                    ativo ? "bg-brand text-white" : cheio ? "bg-white/5 text-slate-600" : "bg-white/10 text-slate-200 hover:bg-white/20"
                  }`}>
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
      </section>

      {/* ---------- RESUMO DO CADASTRO ---------- */}
      {resumo && (
        <div className="space-y-3">
          <div className="card bg-brand/10 text-sm">
            <p className="font-semibold text-brand-light">✅ Resultado cadastrado com sucesso.</p>
            <div className="mt-2"><Bolas numeros={resumo.numeros_sorteados} tamanho="sm" /></div>
            <div className="mt-3 space-y-1 text-slate-200">
              <p>Concurso: <strong>{resumo.concurso}</strong></p>
              <p>Loteria: <strong>{resumo.loteria_nome}</strong></p>
              <p>Previsoes conferidas: <strong>{resumo.previsoes_conferidas}</strong></p>
              <p>Jogos premiados: <strong>{resumo.jogos_premiados}</strong></p>
              <p>Melhor acerto: <strong>{resumo.melhor_acerto}</strong></p>
            </div>
          </div>

          {perguntarProx && (
            <div className="card flex items-center justify-between bg-amber-500/10">
              <p className="text-sm text-slate-200">Deseja atualizar o proximo concurso?</p>
              <div className="flex gap-2">
                <button onClick={() => setPerguntarProx(false)} className="btn-ghost px-3 py-1 text-xs">
                  Agora nao
                </button>
                <button
                  onClick={() => abrirEditarProximo({ numero: resumo.concurso + 1 })}
                  className="btn-primary px-3 py-1 text-xs"
                >
                  Sim
                </button>
              </div>
            </div>
          )}

          {resumo.ganhadores.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Ganhadores</h2>
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

      {/* ---------- ULTIMOS RESULTADOS ---------- */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Ultimos resultados — {loteria.nome}
        </h2>
        {ultimos.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum resultado cadastrado.</p>
        ) : (
          ultimos.map((c) => (
            <div key={c.numero_concurso} className="card space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Concurso <strong className="text-slate-200">{c.numero_concurso}</strong></span>
                <span>{dataBR(c.data_sorteio)}</span>
              </div>
              <Bolas numeros={c.numeros_sorteados} tamanho="sm" />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
