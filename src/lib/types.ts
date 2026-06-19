// Tipos centrais do SorteIA

export type LoteriaId =
  | "megasena"
  | "lotofacil"
  | "lotomania"
  | "quina"
  | "duplasena"
  | "timemania";

export interface Loteria {
  id: LoteriaId;
  nome: string;
  numero_min: number;
  numero_max: number;
  qtd_sorteada: number;
  qtd_aposta_min: number;
  qtd_aposta_max: number;
  preco_base: number;
}

export interface Concurso {
  numero_concurso: number;
  data_sorteio: string;
  numeros_sorteados: number[];
}

export type Estrategia =
  | "conservador"
  | "equilibrado"
  | "agressivo"
  | "adaptativo";

export type Objetivo = "principal" | "parciais";

// Os 8 pesos que governam a pontuacao de cada numero
export interface Pesos {
  peso_frequencia: number;
  peso_atraso: number;
  peso_tendencia: number;
  peso_pares: number;
  peso_trios: number;
  peso_soma: number;
  peso_distribuicao: number;
  peso_cobertura: number;
}

export type PesoKey = keyof Pesos;

export interface Previsao {
  id: string;
  loteria_id: LoteriaId;
  concurso_previsto: number;
  jogos_gerados: number[][];
  estrategia: Estrategia;
  objetivo: Objetivo;
  pesos_usados: Pesos;
  criado_em: string;
}

export interface AnaliseErro {
  faixa_faltante: ("baixos" | "medios" | "altos")[];
  soma_jogo_media: number;
  soma_resultado: number;
  pares_jogo: number;
  pares_resultado: number;
  atrasados_acertados: number;
  frequentes_acertados: number;
  observacoes: string[];
}

export interface ResultadoConferencia {
  resultado_real: number[];
  acertos_por_jogo: number[];
  melhor_acerto: number;
  ganhou: boolean;
  analise_erro: AnaliseErro;
  ajuste_sugerido: Partial<Pesos>;
}
