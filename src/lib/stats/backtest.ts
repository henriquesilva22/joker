import type { Concurso, Estrategia, Loteria, Pesos } from "../types";
import { contarAcertos } from "./check";
import { gerarJogos } from "./generate";
import { combinacoes } from "./probability";

export interface ResultadoBacktest {
  estrategia: Estrategia;
  dezenas_apostadas: number;
  jogos_equivalentes: number;
  custo_por_concurso: number;
  concursos_testados: number;
  media_acertos: number;
  melhor_resultado: number;
  pior_resultado: number;
  investimento_total: number;   // concursos_testados * custo_por_concurso
  premios_recebidos: number;    // soma dos premios de 1 aposta por concurso
  lucro_liquido: number;        // premios_recebidos - investimento_total
  lucro_simulado: number;       // alias de lucro_liquido (compat.)
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
  const jogosEquivalentes = jogosSimplesEquivalentes(loteria, dezenas);
  const custoPorConcurso = Number((jogosEquivalentes * loteria.preco_base).toFixed(2));

  const acertos: number[] = [];
  const histograma: Record<number, number> = {};
  let premiosRecebidos = 0;
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

    // Histograma e melhor acerto consideram todos os jogos gerados.
    let melhorNoConcurso = 0;
    for (const jogo of jogos) {
      const a = contarAcertos(jogo.numeros, alvo.numeros_sorteados);
      histograma[a] = (histograma[a] ?? 0) + 1;
      melhorNoConcurso = Math.max(melhorNoConcurso, a);
    }

    // Financeiro: UMA aposta de `dezenas` dezenas por concurso.
    // (antes o custo/premio eram multiplicados por qtdJogos -> prejuizo inflado)
    const apostaFin = jogos[0];
    if (apostaFin) {
      const acertosFin = contarAcertos(apostaFin.numeros, alvo.numeros_sorteados);
      premiosRecebidos += premioExpandido(premio, loteria, dezenas, acertosFin);
    }

    acertos.push(melhorNoConcurso);
    testados++;
  }

  const media =
    acertos.length > 0
      ? acertos.reduce((a, b) => a + b, 0) / acertos.length
      : 0;

  const investimentoTotal = Number((testados * custoPorConcurso).toFixed(2));
  const premios = Number(premiosRecebidos.toFixed(2));
  const lucroLiquido = Number((premios - investimentoTotal).toFixed(2));

  return {
    estrategia,
    dezenas_apostadas: dezenas,
    jogos_equivalentes: jogosEquivalentes,
    custo_por_concurso: custoPorConcurso,
    concursos_testados: testados,
    media_acertos: Number(media.toFixed(3)),
    melhor_resultado: acertos.length ? Math.max(...acertos) : 0,
    pior_resultado: acertos.length ? Math.min(...acertos) : 0,
    investimento_total: investimentoTotal,
    premios_recebidos: premios,
    lucro_liquido: lucroLiquido,
    lucro_simulado: lucroLiquido,
    acertos_por_faixa: histograma,
    // score: media de acertos normalizada favorece estrategias consistentes
    score: Number((media + (lucroLiquido > 0 ? 0.5 : 0)).toFixed(3)),
  };
}

export interface RecomendacaoDezenas {
  dezenas: number;
  justificativa: string;
}

// IA Adaptativa: varre a faixa de dezenas permitida e descobre qual quantidade
// teve melhor desempenho historico (walk-forward). Retorna a recomendada.
export function melhorDezenasAdaptativa(
  opts: Omit<OpcoesBacktest, "dezenas" | "estrategia"> & { min: number; max: number },
): RecomendacaoDezenas {
  let melhor: { dezenas: number; lucro_simulado: number; media_acertos: number } | null = null;
  for (let d = opts.min; d <= opts.max; d++) {
    const r = rodarBacktest({ ...opts, estrategia: "adaptativo", dezenas: d });
    const cand = {
      dezenas: d,
      lucro_simulado: r.lucro_simulado,
      media_acertos: r.media_acertos,
    };
    if (
      !melhor ||
      cand.lucro_simulado > melhor.lucro_simulado ||
      (cand.lucro_simulado === melhor.lucro_simulado && cand.media_acertos > melhor.media_acertos)
    ) {
      melhor = cand;
    }
  }
  return {
    dezenas: melhor?.dezenas ?? opts.min,
    justificativa: "Melhor lucro historico para esta loteria.",
  };
}

function jogosSimplesEquivalentes(loteria: Loteria, dezenas: number): number {
  return Math.round(combinacoes(dezenas, loteria.qtd_aposta_min));
}

function premioExpandido(
  premioPorAcerto: Record<number, number>,
  loteria: Loteria,
  dezenas: number,
  acertosNoJogo: number,
): number {
  const errosNoJogo = dezenas - acertosNoJogo;
  const apostaMinima = loteria.qtd_aposta_min;

  let total = 0;
  for (const [faixaStr, premio] of Object.entries(premioPorAcerto)) {
    const faixa = Number(faixaStr);
    const combinacoesPremiadas =
      combinacoes(acertosNoJogo, faixa) * combinacoes(errosNoJogo, apostaMinima - faixa);
    if (combinacoesPremiadas > 0) total += combinacoesPremiadas * premio;
  }
  return total;
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
