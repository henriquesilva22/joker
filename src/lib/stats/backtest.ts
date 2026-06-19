import type { Concurso, Estrategia, Loteria, Pesos } from "../types";
import { contarAcertos } from "./check";
import { gerarJogos } from "./generate";

export interface ResultadoBacktest {
  estrategia: Estrategia;
  concursos_testados: number;
  media_acertos: number;
  melhor_resultado: number;
  pior_resultado: number;
  lucro_simulado: number;
  acertos_por_faixa: Record<number, number>; // histograma de acertos
  score: number; // metrica agregada para o modo adaptativo / ranking
}

export interface OpcoesBacktest {
  loteria: Loteria;
  concursos: Concurso[];      // historico completo, ordenado por concurso
  pesos: Pesos;
  estrategia: Estrategia;
  qtdJogos?: number;          // jogos por concurso simulado
  dezenas?: number;           // dezenas por jogo
  janelaMin?: number;         // minimo de concursos para treinar antes de prever
  passo?: number;             // pular concursos para acelerar (1 = todos)
  premioPorAcerto?: Record<number, number>; // tabela de premio para lucro simulado
}

// Walk-forward: para cada concurso C (a partir de janelaMin), gera jogos usando
// apenas os concursos < C e confere contra o proprio C. Sem vazamento de futuro.
export function rodarBacktest(opts: OpcoesBacktest): ResultadoBacktest {
  const {
    loteria,
    concursos,
    pesos,
    estrategia,
    qtdJogos = 5,
    dezenas = loteria.qtd_aposta_min,
    janelaMin = 100,
    passo = 1,
  } = opts;

  const ordenados = [...concursos].sort(
    (a, b) => a.numero_concurso - b.numero_concurso,
  );
  const premio = opts.premioPorAcerto ?? premioPadrao(loteria);

  const acertos: number[] = [];
  const histograma: Record<number, number> = {};
  let lucro = 0;
  let custo = 0;
  let testados = 0;

  for (let i = janelaMin; i < ordenados.length; i += passo) {
    const treino = ordenados.slice(0, i);
    const alvo = ordenados[i];
    const jogos = gerarJogos({
      loteria,
      concursos: treino,
      pesos,
      estrategia,
      qtdJogos,
      qtdDezenas: dezenas,
      objetivo: "parciais",
      seed: 1000 + i, // determinismo por concurso
    });

    let melhorNoConcurso = 0;
    for (const jogo of jogos) {
      const a = contarAcertos(jogo.numeros, alvo.numeros_sorteados);
      histograma[a] = (histograma[a] ?? 0) + 1;
      melhorNoConcurso = Math.max(melhorNoConcurso, a);
      lucro += premio[a] ?? 0;
      custo += loteria.preco_base;
    }
    acertos.push(melhorNoConcurso);
    testados++;
  }

  const media =
    acertos.length > 0
      ? acertos.reduce((a, b) => a + b, 0) / acertos.length
      : 0;

  return {
    estrategia,
    concursos_testados: testados,
    media_acertos: Number(media.toFixed(3)),
    melhor_resultado: acertos.length ? Math.max(...acertos) : 0,
    pior_resultado: acertos.length ? Math.min(...acertos) : 0,
    lucro_simulado: Number((lucro - custo).toFixed(2)),
    acertos_por_faixa: histograma,
    // score: media de acertos normalizada favorece estrategias consistentes
    score: Number((media + (lucro - custo > 0 ? 0.5 : 0)).toFixed(3)),
  };
}

// Tabela de premio simplificada (valores ilustrativos para lucro simulado).
function premioPadrao(loteria: Loteria): Record<number, number> {
  switch (loteria.id) {
    case "megasena":
      return { 4: 1000, 5: 50000, 6: 50000000 };
    case "lotofacil":
      return { 11: 6, 12: 12, 13: 30, 14: 1500, 15: 500000 };
    case "quina":
      return { 2: 4, 3: 130, 4: 8000, 5: 500000 };
    case "lotomania":
      return { 15: 8, 16: 25, 17: 200, 18: 2000, 19: 50000, 20: 500000, 0: 5000 };
    case "duplasena":
      return { 3: 5, 4: 80, 5: 2000, 6: 300000 };
    case "timemania":
      return { 3: 3, 4: 9, 5: 30, 6: 2000, 7: 300000 };
    default:
      return {};
  }
}
