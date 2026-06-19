import Anthropic from "@anthropic-ai/sdk";
import type { AnaliseErro, Loteria, Pesos } from "./types";

const MODELO = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

function cliente(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

export interface ContextoExplicacao {
  loteria: Loteria;
  resultadoReal: number[];
  melhorJogo: number[];
  melhorAcerto: number;
  ganhou: boolean;
  analise: AnaliseErro;
  ajuste: Partial<Pesos>;
}

// Gera a explicacao da IA em linguagem natural sobre o que acertou/errou
// e o que sera ajustado. Texto curto, honesto e em portugues.
export async function explicarAnalise(ctx: ContextoExplicacao): Promise<string> {
  const prompt = `Voce e a IA explicativa do app SorteIA, que faz previsoes ESTATISTICAS de loteria.
Seja honesto: loteria e aleatoria e nao ha garantia de vitoria. Nao prometa ganhos.

Loteria: ${ctx.loteria.nome}
Resultado real: ${ctx.resultadoReal.join(", ")}
Melhor jogo gerado: ${ctx.melhorJogo.join(", ")}
Acertos: ${ctx.melhorAcerto} ${ctx.ganhou ? "(premiado!)" : "(sem premio)"}

Diagnostico estatistico:
- Faixas faltantes: ${ctx.analise.faixa_faltante.join(", ") || "nenhuma"}
- Soma do jogo: ${ctx.analise.soma_jogo_media} vs soma do resultado: ${ctx.analise.soma_resultado}
- Pares no jogo: ${ctx.analise.pares_jogo} vs pares no resultado: ${ctx.analise.pares_resultado}
- Numeros atrasados acertados: ${ctx.analise.atrasados_acertados}
- Numeros frequentes acertados: ${ctx.analise.frequentes_acertados}
- Observacoes: ${ctx.analise.observacoes.join(" ") || "—"}

Ajuste de pesos sugerido: ${JSON.stringify(ctx.ajuste)}

Escreva no maximo 4 frases curtas em portugues, em tom claro e tecnico-amigavel:
1) o que o jogo acertou no padrao;
2) onde errou;
3) o que a IA vai mudar no proximo jogo;
4) lembrete de que e estatistica, nao garantia.`;

  const resp = await cliente().messages.create({
    model: MODELO,
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const bloco = resp.content.find((b) => b.type === "text");
  return bloco && bloco.type === "text"
    ? bloco.text.trim()
    : "Analise indisponivel no momento.";
}
