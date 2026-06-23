import type {
  AnaliseErro,
  Concurso,
  Loteria,
  Pesos,
  ResultadoConferencia,
} from "../types";
import { calcularFeatures, faixaIndice } from "./features";

// Faixas de premiacao por loteria: minimo de acertos que paga.
export const PREMIA_A_PARTIR_DE: Record<string, number> = {
  megasena: 4,    // quadra
  lotofacil: 11,
  lotomania: 15,  // (alem de 0 acertos) - simplificado
  quina: 2,       // duque
  duplasena: 4,
  timemania: 3,
};

export function contarAcertos(jogo: number[], resultado: number[]): number {
  const set = new Set(resultado);
  let n = 0;
  for (const x of jogo) if (set.has(x)) n++;
  return n;
}

// Conferencia de uma previsao inteira (varios jogos) contra o resultado real.
export function conferir(
  loteria: Loteria,
  jogos: number[][],
  resultado: number[],
  concursosAnteriores: Concurso[],
  pesosUsados: Pesos,
): ResultadoConferencia {
  const acertos_por_jogo = jogos.map((j) => contarAcertos(j, resultado));
  const melhor_acerto = acertos_por_jogo.length
    ? Math.max(...acertos_por_jogo)
    : 0;
  const limite = PREMIA_A_PARTIR_DE[loteria.id] ?? loteria.qtd_sorteada;
  const ganhou = melhor_acerto >= limite;

  const idxMelhor = acertos_por_jogo.indexOf(melhor_acerto);
  const melhorJogo = jogos[idxMelhor] ?? [];
  const analise_erro = analisar(
    loteria,
    melhorJogo,
    resultado,
    concursosAnteriores,
  );
  const ajuste_sugerido = sugerirAjuste(analise_erro, pesosUsados);

  return {
    resultado_real: resultado,
    acertos_por_jogo,
    melhor_acerto,
    ganhou,
    analise_erro,
    ajuste_sugerido,
  };
}

// Diagnostico: compara o melhor jogo com o resultado real.
export function analisar(
  loteria: Loteria,
  jogo: number[],
  resultado: number[],
  concursosAnteriores: Concurso[],
): AnaliseErro {
  const f = calcularFeatures(loteria, concursosAnteriores);

  const distJogo = [0, 0, 0];
  for (const n of jogo) distJogo[faixaIndice(loteria, n)]++;
  const distRes = [0, 0, 0];
  for (const n of resultado) distRes[faixaIndice(loteria, n)]++;

  const nomesFaixa = ["baixos", "medios", "altos"] as const;
  const faixa_faltante: ("baixos" | "medios" | "altos")[] = [];
  for (let i = 0; i < 3; i++) {
    if (distRes[i] - distJogo[i] >= 1) faixa_faltante.push(nomesFaixa[i]);
  }

  const somaJogo = jogo.reduce((a, b) => a + b, 0);
  const somaRes = resultado.reduce((a, b) => a + b, 0);
  const paresJogo = jogo.filter((n) => n % 2 === 0).length;
  const paresRes = resultado.filter((n) => n % 2 === 0).length;

  // dos numeros que SAIRAM, quantos eram atrasados vs frequentes?
  const acertados = resultado.filter((n) => jogo.includes(n));
  let atrasados_acertados = 0;
  let frequentes_acertados = 0;
  for (const n of acertados) {
    if ((f.atraso.get(n) ?? 0) >= 0.6) atrasados_acertados++;
    if ((f.frequencia.get(n) ?? 0) >= 0.6) frequentes_acertados++;
  }

  const observacoes: string[] = [];
  if (faixa_faltante.length)
    observacoes.push(`Faltaram numeros nas faixas: ${faixa_faltante.join(", ")}.`);
  if (Math.abs(somaJogo - somaRes) > f.somaDesvio)
    observacoes.push(
      somaJogo < somaRes
        ? "A soma do jogo ficou abaixo do resultado real."
        : "A soma do jogo ficou acima do resultado real.",
    );
  if (paresJogo - paresRes >= 2)
    observacoes.push("Excesso de numeros pares em relacao ao sorteio.");
  else if (paresRes - paresJogo >= 2)
    observacoes.push("Faltaram numeros pares em relacao ao sorteio.");

  return {
    faixa_faltante,
    soma_jogo_media: somaJogo,
    soma_resultado: somaRes,
    pares_jogo: paresJogo,
    pares_resultado: paresRes,
    atrasados_acertados,
    frequentes_acertados,
    observacoes,
  };
}

// Converte o diagnostico em um delta de pesos (a ser aplicado em learn.ts).
function sugerirAjuste(a: AnaliseErro, _atual: Pesos): Partial<Pesos> {
  const d: Partial<Pesos> = {};
  const PASSO = 0.08;

  // Se os numeros que sairam eram quentes, reforca tendencia/frequencia.
  if (a.frequentes_acertados >= 2) {
    d.peso_frequencia = PASSO;
  }
  // Se acertou atrasados, mantem; se nao acertou nenhum atrasado, reduz.
  if (a.atrasados_acertados === 0) {
    d.peso_atraso = -PASSO;
    d.peso_tendencia = (d.peso_tendencia ?? 0) + PASSO;
  } else if (a.atrasados_acertados >= 2) {
    d.peso_atraso = PASSO;
  }
  // Faixas faltantes -> reforca distribuicao e cobertura.
  if (a.faixa_faltante.length >= 1) {
    d.peso_distribuicao = (d.peso_distribuicao ?? 0) + PASSO;
    d.peso_cobertura = (d.peso_cobertura ?? 0) + PASSO * 0.5;
  }
  // Soma desalinhada -> reforca controle de soma.
  if (Math.abs(a.soma_jogo_media - a.soma_resultado) > 0) {
    d.peso_soma = (d.peso_soma ?? 0) + PASSO * 0.5;
  }
  return d;
}
