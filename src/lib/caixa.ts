import type { LoteriaId } from "./types";

// Mapeia nossos ids para os slugs da API publica da Caixa.
const SLUG_CAIXA: Record<LoteriaId, string> = {
  megasena: "megasena",
  lotofacil: "lotofacil",
  lotomania: "lotomania",
  quina: "quina",
  duplasena: "duplasena",
  timemania: "timemania",
};

const BASE = "https://servicebus2.caixa.gov.br/portaldeloterias/api";

export interface ResultadoOficial {
  numero_concurso: number;
  data_sorteio: string;       // ISO yyyy-mm-dd
  numeros_sorteados: number[];
  acumulado: boolean;
}

// Busca um concurso (ou o ultimo, se `numero` for omitido).
// A API da Caixa nao tem CORS, entao chame SEMPRE do servidor.
export async function buscarResultadoCaixa(
  loteria: LoteriaId,
  numero?: number,
): Promise<ResultadoOficial | null> {
  const slug = SLUG_CAIXA[loteria];
  const url = numero ? `${BASE}/${slug}/${numero}` : `${BASE}/${slug}`;
  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
    // resultados mudam 1x/dia; cache curto
    next: { revalidate: 3600 },
  });
  if (!resp.ok) return null;
  const j: any = await resp.json();
  if (!j || !j.listaDezenas) return null;

  const [dia, mes, ano] = String(j.dataApuracao).split("/");
  return {
    numero_concurso: Number(j.numero),
    data_sorteio: `${ano}-${mes}-${dia}`,
    numeros_sorteados: (j.listaDezenas as string[]).map((d) => Number(d)),
    acumulado: Boolean(j.acumulado),
  };
}
