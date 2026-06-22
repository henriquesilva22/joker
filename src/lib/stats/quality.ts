import type { Loteria } from "../types";
import { calcularFeatures, faixaIndice, type Features } from "./features";
import type { Concurso } from "../types";

// Indice de Qualidade do jogo (0-100). NAO e chance de ganhar: e o quanto o
// jogo respeita boa estrutura estatistica + diversidade do conjunto. Mais
// intuitivo para o usuario do que "1 em 50 milhoes".

export interface QualidadeJogo {
  total: number;            // 0-100
  estrutura: number;        // 0-100 (paridade, soma, distribuicao por faixa)
  tendencia: number;        // 0-100 (quao "quentes" sao as dezenas)
  cobertura: number;        // 0-100 (espalhamento pelo volante)
}

export interface QualidadeConjunto {
  media_qualidade: number;  // media das qualidades individuais
  diversidade: number;      // 0-100 (1 - sobreposicao media entre jogos)
  total: number;            // nota final do conjunto (0-100)
  por_jogo: QualidadeJogo[];
}

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

// ----- Qualidade de UM jogo -----
export function qualidadeJogo(
  loteria: Loteria,
  jogo: number[],
  f: Features,
): QualidadeJogo {
  const dezenas = jogo.length;

  // Estrutura 1: paridade (ideal ~ metade par)
  const pares = jogo.filter((n) => n % 2 === 0).length;
  const idealPares = dezenas / 2;
  const desvioPar = Math.abs(pares - idealPares) / idealPares; // 0=perfeito
  const sPar = 1 - Math.min(1, desvioPar);

  // Estrutura 2: soma proxima da media historica (dentro de ~2 desvios)
  const soma = jogo.reduce((a, b) => a + b, 0);
  const z = Math.abs(soma - f.somaMedia) / (f.somaDesvio * 2 || 1);
  const sSoma = 1 - Math.min(1, z);

  // Estrutura 3: distribuicao por faixa proxima do alvo historico
  const dist = [0, 0, 0];
  for (const n of jogo) dist[faixaIndice(loteria, n)]++;
  const totalAlvo = f.faixaAlvo.reduce((a, b) => a + b, 0) || 1;
  const alvoDezenas = f.faixaAlvo.map((v) => (v / totalAlvo) * dezenas);
  const erroDist =
    dist.reduce((acc, d, i) => acc + Math.abs(d - alvoDezenas[i]), 0) /
    (2 * dezenas); // normaliza
  const sDist = 1 - Math.min(1, erroDist);

  const estrutura = ((sPar + sSoma + sDist) / 3) * 100;

  // Tendencia: media da tendencia normalizada das dezenas escolhidas
  const tend =
    jogo.reduce((acc, n) => acc + (f.tendencia.get(n) ?? 0), 0) / dezenas;
  const tendencia = tend * 100;

  // Cobertura: o quanto o jogo cobre o volante (amplitude + espalhamento)
  const ordenado = [...jogo].sort((a, b) => a - b);
  const amplitude =
    (ordenado[ordenado.length - 1] - ordenado[0]) /
    (loteria.numero_max - loteria.numero_min || 1);
  // gaps regulares = melhor espalhamento
  let gaps = 0;
  for (let i = 1; i < ordenado.length; i++) gaps += ordenado[i] - ordenado[i - 1];
  const gapMedio = gaps / (ordenado.length - 1 || 1);
  const gapIdeal = (loteria.numero_max - loteria.numero_min) / dezenas;
  const sGap = 1 - Math.min(1, Math.abs(gapMedio - gapIdeal) / gapIdeal);
  const cobertura = ((amplitude + sGap) / 2) * 100;

  const total = estrutura * 0.5 + tendencia * 0.2 + cobertura * 0.3;

  return {
    total: clamp100(total),
    estrutura: clamp100(estrutura),
    tendencia: clamp100(tendencia),
    cobertura: clamp100(cobertura),
  };
}

// Sobreposicao media entre todos os pares de jogos -> diversidade.
export function diversidadeConjunto(jogos: number[][]): number {
  if (jogos.length < 2) return 100;
  const sets = jogos.map((j) => new Set(j));
  let somaOverlap = 0;
  let pares = 0;
  for (let i = 0; i < jogos.length; i++) {
    for (let k = i + 1; k < jogos.length; k++) {
      let inter = 0;
      for (const n of sets[i]) if (sets[k].has(n)) inter++;
      const tam = Math.min(sets[i].size, sets[k].size) || 1;
      somaOverlap += inter / tam; // 0 = totalmente diferentes, 1 = iguais
      pares++;
    }
  }
  const overlapMedio = pares ? somaOverlap / pares : 0;
  return clamp100((1 - overlapMedio) * 100);
}

// ----- Qualidade do CONJUNTO de jogos -----
export function qualidadeConjunto(
  loteria: Loteria,
  jogos: number[][],
  concursos: Concurso[],
): QualidadeConjunto {
  const f = calcularFeatures(loteria, concursos);
  const por_jogo = jogos.map((j) => qualidadeJogo(loteria, j, f));
  const media =
    por_jogo.reduce((a, q) => a + q.total, 0) / (por_jogo.length || 1);
  const diversidade = diversidadeConjunto(jogos);
  const total = clamp100(media * 0.7 + diversidade * 0.3);
  return {
    media_qualidade: clamp100(media),
    diversidade,
    total,
    por_jogo,
  };
}
