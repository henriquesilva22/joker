import type { Pesos } from "../types";
import { PESOS_PADRAO } from "../lotteries";

const PESO_MIN = 0.1;
const PESO_MAX = 3.0;
// Quanto do delta sugerido e absorvido por conferencia (taxa de aprendizado).
const TAXA_APRENDIZADO = 0.6;

function limitar(v: number): number {
  return Math.min(PESO_MAX, Math.max(PESO_MIN, v));
}

// Aplica o ajuste sugerido aos pesos atuais, com taxa de aprendizado e clamp.
export function aplicarAjuste(
  atual: Pesos,
  delta: Partial<Pesos>,
  taxa = TAXA_APRENDIZADO,
): Pesos {
  const novo: Pesos = { ...PESOS_PADRAO, ...atual };
  for (const k of Object.keys(delta) as (keyof Pesos)[]) {
    const d = delta[k] ?? 0;
    novo[k] = limitar((novo[k] ?? 1) + d * taxa);
  }
  return novo;
}

// Diferenca legivel entre dois conjuntos de pesos (para UI / logs).
export function diffPesos(antes: Pesos, depois: Pesos): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(depois) as (keyof Pesos)[]) {
    const d = (depois[k] ?? 0) - (antes[k] ?? 0);
    if (Math.abs(d) > 1e-6) out[k] = Number(d.toFixed(3));
  }
  return out;
}

// Combina os pesos que tiveram melhor desempenho medio em backtests
// (usado pelo modo IA Adaptativa). `amostras` = pares (pesos, score).
export function pesosAdaptativos(
  amostras: { pesos: Pesos; score: number }[],
): Pesos {
  if (amostras.length === 0) return { ...PESOS_PADRAO };
  const validos = amostras.filter((a) => a.score > 0);
  if (validos.length === 0) return { ...PESOS_PADRAO };
  const total = validos.reduce((a, b) => a + b.score, 0);
  const acc: Pesos = { ...PESOS_PADRAO };
  for (const k of Object.keys(acc) as (keyof Pesos)[]) acc[k] = 0;
  for (const { pesos, score } of validos) {
    const w = score / total;
    for (const k of Object.keys(acc) as (keyof Pesos)[]) {
      acc[k] += (pesos[k] ?? 1) * w;
    }
  }
  for (const k of Object.keys(acc) as (keyof Pesos)[]) acc[k] = limitar(acc[k]);
  return acc;
}
