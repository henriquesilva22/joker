// Parser de numeros "colados" (WhatsApp, Caixa, planilhas, PDFs...).
// Ignora virgulas, espacos, pontos, tracos, barras, setas e quebras de linha:
// extrai apenas grupos de digitos. "03" vira 3. Remove duplicados e ordena.
export function parseNumeros(texto: string): number[] {
  const tokens = (texto ?? "").match(/\d+/g) ?? [];
  const nums = tokens
    .map((t) => parseInt(t, 10))
    .filter((n) => Number.isFinite(n));
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

export interface ResultadoColagem {
  numeros: number[];
  erro?: string;
}

// Valida os numeros colados contra o intervalo da loteria e a quantidade
// esperada na tela atual. Mensagens conforme especificacao.
export function validarColagem(
  texto: string,
  opts: { min: number; max: number; esperado: number },
): ResultadoColagem {
  const numeros = parseNumeros(texto);

  const foraDoIntervalo = numeros.some((n) => n < opts.min || n > opts.max);
  if (foraDoIntervalo) {
    return {
      numeros,
      erro: "Alguns numeros estao fora do intervalo permitido para esta loteria.",
    };
  }

  if (numeros.length < opts.esperado) {
    const faltam = opts.esperado - numeros.length;
    return {
      numeros,
      erro: `Foram encontrados ${numeros.length} numeros. Selecione mais ${faltam}.`,
    };
  }

  if (numeros.length > opts.esperado) {
    return {
      numeros,
      erro: `Foram encontrados ${numeros.length} numeros. O limite para esta aposta e ${opts.esperado}.`,
    };
  }

  return { numeros };
}
