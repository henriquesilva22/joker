import type { AnaliseErro, Loteria, Pesos } from "./types";
import { ROTULO_ESTRATEGIA } from "./lotteries";

export interface ContextoExplicacao {
  loteria: Loteria;
  resultadoReal: number[];
  melhorJogo: number[];
  melhorAcerto: number;
  ganhou: boolean;
  analise: AnaliseErro;
  ajuste: Partial<Pesos>;
}

const NOME_PESO: Record<keyof Pesos, string> = {
  peso_frequencia: "frequencia",
  peso_atraso: "atrasados",
  peso_tendencia: "tendencia recente",
  peso_pares: "forca em pares",
  peso_trios: "forca em trios",
  peso_soma: "controle de soma",
  peso_distribuicao: "distribuicao por faixa",
  peso_cobertura: "cobertura entre jogos",
};

// Gera a explicacao da IA em linguagem natural a partir do diagnostico
// estatistico, sem depender de nenhuma API externa.
export function explicarAnalise(ctx: ContextoExplicacao): string {
  const { analise, ajuste } = ctx;
  const frases: string[] = [];

  // 1) O que o jogo acertou no padrao
  const acertosPadrao: string[] = [];
  if (analise.frequentes_acertados >= 1)
    acertosPadrao.push(`acertou ${analise.frequentes_acertados} numero(s) frequente(s)`);
  if (analise.atrasados_acertados >= 1)
    acertosPadrao.push(`pegou ${analise.atrasados_acertados} atrasado(s) que sairam`);
  if (Math.abs(analise.soma_jogo_media - analise.soma_resultado) <= 10)
    acertosPadrao.push("manteve a soma proxima do resultado");
  frases.push(
    acertosPadrao.length
      ? `O melhor jogo ${acertosPadrao.join(", ")} (${ctx.melhorAcerto} acerto(s)).`
      : `O melhor jogo fez ${ctx.melhorAcerto} acerto(s) neste concurso.`,
  );

  // 2) Onde errou
  const erros: string[] = [];
  if (analise.faixa_faltante.length)
    erros.push(`faltaram numeros nas faixas ${analise.faixa_faltante.join(", ")}`);
  const difSoma = analise.soma_resultado - analise.soma_jogo_media;
  if (difSoma > 10) erros.push("a soma do jogo ficou abaixo do sorteio");
  else if (difSoma < -10) erros.push("a soma do jogo ficou acima do sorteio");
  if (analise.pares_resultado - analise.pares_jogo >= 2) erros.push("faltaram numeros pares");
  else if (analise.pares_jogo - analise.pares_resultado >= 2) erros.push("houve pares demais");
  if (erros.length) frases.push(`Onde errou: ${erros.join("; ")}.`);

  // 3) O que a IA vai mudar
  const mudancas = (Object.keys(ajuste) as (keyof Pesos)[])
    .map((k) => {
      const v = ajuste[k] ?? 0;
      if (Math.abs(v) < 1e-6) return null;
      return `${v > 0 ? "aumentar" : "reduzir"} ${NOME_PESO[k]}`;
    })
    .filter(Boolean) as string[];
  frases.push(
    mudancas.length
      ? `Ajuste para o proximo jogo: ${mudancas.join(", ")}.`
      : "Os pesos seguem calibrados; sem mudancas relevantes desta vez.",
  );

  // 4) Lembrete honesto
  frases.push(
    "Lembre-se: e estatistica sobre o historico, nao garantia — loteria e aleatoria.",
  );

  return frases.join(" ");
}

// Pequeno resumo textual da estrategia usada (opcional para a UI).
export function resumoEstrategia(ctx: ContextoExplicacao, estrategia: keyof typeof ROTULO_ESTRATEGIA): string {
  return `${ROTULO_ESTRATEGIA[estrategia]} em ${ctx.loteria.nome}.`;
}
