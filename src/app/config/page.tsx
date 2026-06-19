"use client";

import { useEffect, useState } from "react";
import { LoteriaSelect } from "@/components/LoteriaSelect";
import { PesosRadar } from "@/components/PesosRadar";
import { PESOS_PADRAO } from "@/lib/lotteries";
import type { LoteriaId, Pesos } from "@/lib/types";

export default function ConfigPage() {
  const [loteriaId, setLoteriaId] = useState<LoteriaId>("megasena");
  const [pesos, setPesos] = useState<Pesos>(PESOS_PADRAO);
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregar(id: LoteriaId) {
    setCarregando(true);
    const r = await fetch(`/api/pesos?loteria=${id}`);
    const data = await r.json();
    if (data.pesos) setPesos(data.pesos);
    setCarregando(false);
  }

  useEffect(() => {
    carregar(loteriaId);
  }, [loteriaId]);

  async function resetar() {
    const r = await fetch(`/api/pesos?loteria=${loteriaId}`, { method: "DELETE" });
    if (r.status === 401) setMsg("Faca login para ajustar a IA.");
    else {
      const data = await r.json();
      setPesos(data.pesos);
      setMsg("Pesos resetados para o padrao.");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Configuracoes da IA</h1>
      <p className="text-sm text-slate-400">
        Estes sao os pesos que a IA aprendeu para esta loteria. Eles mudam
        sozinhos a cada conferencia de resultado.
      </p>
      <LoteriaSelect valor={loteriaId} onChange={setLoteriaId} />

      <div className="card">
        {carregando ? (
          <p className="text-slate-400">Carregando pesos...</p>
        ) : (
          <PesosRadar pesos={pesos} />
        )}
      </div>

      <div className="card grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {(Object.keys(pesos) as (keyof Pesos)[]).map((k) => (
          <div key={k} className="flex justify-between">
            <span className="capitalize text-slate-400">{k.replace("peso_", "")}</span>
            <span className="font-mono">{pesos[k].toFixed(2)}</span>
          </div>
        ))}
      </div>

      <button className="btn-ghost w-full" onClick={resetar}>
        Resetar pesos para o padrao
      </button>
      {msg && <p className="text-sm text-brand-light">{msg}</p>}
    </div>
  );
}
