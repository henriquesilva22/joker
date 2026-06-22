import type { Concurso } from "../types";

// Similaridade Historica: em vez de "prever", o sistema mostra quais concursos
// passados mais se parecem com o jogo gerado. Ajuda o usuario a entender o
// jogo em termos de cenarios ja vistos.

export interface ConcursoSimilar {
  numero_concurso: number;
  data_sorteio: string;
  numeros_sorteados: number[];
  comuns: number[];        // dezenas em comum com o jogo
  similaridade: number;    // 0-100 (indice de Jaccard)
}

// Jaccard: |interseccao| / |uniao|. Robusto quando os tamanhos diferem.
function jaccard(a: Set<number>, b: number[]): { inter: number[]; score: number } {
  const inter: number[] = [];
  const uniao = new Set(a);
  for (const n of b) {
    if (a.has(n)) inter.push(n);
    uniao.add(n);
  }
  return { inter: inter.sort((x, y) => x - y), score: inter.length / uniao.size };
}

// Top-K concursos mais semelhantes ao jogo informado.
export function concursosSimilares(
  jogo: number[],
  concursos: Concurso[],
  topK = 3,
): ConcursoSimilar[] {
  const set = new Set(jogo);
  const ranked = concursos.map((c) => {
    const { inter, score } = jaccard(set, c.numeros_sorteados);
    return {
      numero_concurso: c.numero_concurso,
      data_sorteio: c.data_sorteio,
      numeros_sorteados: c.numeros_sorteados,
      comuns: inter,
      similaridade: Math.round(score * 100),
    };
  });
  ranked.sort(
    (a, b) => b.similaridade - a.similaridade || b.numero_concurso - a.numero_concurso,
  );
  return ranked.slice(0, topK);
}
