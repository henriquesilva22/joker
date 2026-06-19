import type { Concurso, Loteria } from "../types";
import { universo } from "../lotteries";

// Todas as features sao normalizadas para [0,1] para que os pesos sejam
// comparaveis entre si, independente da loteria.

export interface Features {
  numeros: number[];                       // universo ordenado
  frequencia: Map<number, number>;         // 0..1 (quao frequente)
  atraso: Map<number, number>;             // 0..1 (ha quanto tempo nao sai)
  tendencia: Map<number, number>;          // 0..1 (quente nos ultimos N)
  forcaPares: Map<number, number>;         // 0..1 (aparece em pares fortes)
  forcaTrios: Map<number, number>;         // 0..1 (aparece em trios fortes)
  somaMedia: number;                       // soma media historica do sorteio
  somaDesvio: number;                      // desvio padrao da soma
  faixaAlvo: number[];                     // distribuicao alvo por faixa (3 faixas)
  totalConcursos: number;
}

function normalizar(mapa: Map<number, number>): Map<number, number> {
  let min = Infinity;
  let max = -Infinity;
  for (const v of mapa.values()) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  const out = new Map<number, number>();
  for (const [k, v] of mapa) out.set(k, (v - min) / span);
  return out;
}

export function calcularFeatures(
  loteria: Loteria,
  concursos: Concurso[],
  janelaTendencia = 30,
): Features {
  const nums = universo(loteria);
  const freqRaw = new Map<number, number>(nums.map((n) => [n, 0]));
  // ordena do mais antigo para o mais recente
  const ordenados = [...concursos].sort(
    (a, b) => a.numero_concurso - b.numero_concurso,
  );
  const total = ordenados.length;

  // ----- Frequencia -----
  for (const c of ordenados) {
    for (const n of c.numeros_sorteados) {
      freqRaw.set(n, (freqRaw.get(n) ?? 0) + 1);
    }
  }

  // ----- Atraso: quantos concursos desde a ultima aparicao -----
  const atrasoRaw = new Map<number, number>(nums.map((n) => [n, total]));
  for (let i = ordenados.length - 1, dist = 0; i >= 0; i--, dist++) {
    for (const n of ordenados[i].numeros_sorteados) {
      // primeira vez (de tras pra frente) que vemos n -> esse e o atraso atual
      if (atrasoRaw.get(n) === total) atrasoRaw.set(n, dist);
    }
  }

  // ----- Tendencia: frequencia nos ultimos `janela` concursos -----
  const tendRaw = new Map<number, number>(nums.map((n) => [n, 0]));
  const recentes = ordenados.slice(-janelaTendencia);
  for (const c of recentes) {
    for (const n of c.numeros_sorteados) {
      tendRaw.set(n, (tendRaw.get(n) ?? 0) + 1);
    }
  }

  // ----- Forca em pares e trios (co-ocorrencia) -----
  const paresCount = new Map<number, number>(nums.map((n) => [n, 0]));
  const triosCount = new Map<number, number>(nums.map((n) => [n, 0]));
  for (const c of recentes) {
    const s = c.numeros_sorteados;
    for (let i = 0; i < s.length; i++) {
      for (let j = i + 1; j < s.length; j++) {
        paresCount.set(s[i], (paresCount.get(s[i]) ?? 0) + 1);
        paresCount.set(s[j], (paresCount.get(s[j]) ?? 0) + 1);
        for (let k = j + 1; k < s.length; k++) {
          triosCount.set(s[i], (triosCount.get(s[i]) ?? 0) + 1);
          triosCount.set(s[j], (triosCount.get(s[j]) ?? 0) + 1);
          triosCount.set(s[k], (triosCount.get(s[k]) ?? 0) + 1);
        }
      }
    }
  }

  // ----- Soma media historica + desvio -----
  const somas = ordenados.map((c) =>
    c.numeros_sorteados.reduce((a, b) => a + b, 0),
  );
  const somaMedia = somas.length
    ? somas.reduce((a, b) => a + b, 0) / somas.length
    : 0;
  const somaVar = somas.length
    ? somas.reduce((a, s) => a + (s - somaMedia) ** 2, 0) / somas.length
    : 1;
  const somaDesvio = Math.sqrt(somaVar) || 1;

  // ----- Distribuicao alvo por faixa (3 faixas iguais) -----
  // quantos numeros de cada faixa aparecem em media por sorteio
  const faixaCount = [0, 0, 0];
  for (const c of ordenados) {
    for (const n of c.numeros_sorteados) {
      faixaCount[faixaIndice(loteria, n)]++;
    }
  }
  const faixaAlvo = faixaCount.map((c) => (total ? c / total : 0));

  return {
    numeros: nums,
    frequencia: normalizar(freqRaw),
    // atraso alto = bom para estrategias agressivas; invertido para virar 0..1 "quente->frio"
    atraso: normalizar(atrasoRaw),
    tendencia: normalizar(tendRaw),
    forcaPares: normalizar(paresCount),
    forcaTrios: normalizar(triosCount),
    somaMedia,
    somaDesvio,
    faixaAlvo,
    totalConcursos: total,
  };
}

// 0 = baixos, 1 = medios, 2 = altos
export function faixaIndice(loteria: Loteria, n: number): number {
  const span = loteria.numero_max - loteria.numero_min + 1;
  const rel = n - loteria.numero_min;
  const idx = Math.floor((rel / span) * 3);
  return Math.min(2, idx);
}
