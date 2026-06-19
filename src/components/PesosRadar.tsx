"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import type { Pesos } from "@/lib/types";

const ROTULOS: Record<keyof Pesos, string> = {
  peso_frequencia: "Frequencia",
  peso_atraso: "Atraso",
  peso_tendencia: "Tendencia",
  peso_pares: "Pares",
  peso_trios: "Trios",
  peso_soma: "Soma",
  peso_distribuicao: "Distrib.",
  peso_cobertura: "Cobertura",
};

export function PesosRadar({ pesos }: { pesos: Pesos }) {
  const data = (Object.keys(ROTULOS) as (keyof Pesos)[]).map((k) => ({
    eixo: ROTULOS[k],
    valor: pesos[k],
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="eixo" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Radar dataKey="valor" stroke="#22c55e" fill="#16a34a" fillOpacity={0.5} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
