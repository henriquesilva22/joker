import type { Loteria, LoteriaId, Pesos, Estrategia } from "./types";

// Espelho do seed em supabase/schema.sql. Usado para validacao e UI offline.
export const LOTERIAS: Record<LoteriaId, Loteria> = {
  megasena: {
    id: "megasena",
    nome: "Mega-Sena",
    numero_min: 1,
    numero_max: 60,
    qtd_sorteada: 6,
    qtd_aposta_min: 6,
    qtd_aposta_max: 20,
    preco_base: 5.0,
  },
  lotofacil: {
    id: "lotofacil",
    nome: "Lotofacil",
    numero_min: 1,
    numero_max: 25,
    qtd_sorteada: 15,
    qtd_aposta_min: 15,
    qtd_aposta_max: 20,
    preco_base: 3.0,
  },
  lotomania: {
    id: "lotomania",
    nome: "Lotomania",
    numero_min: 0,
    numero_max: 99,
    qtd_sorteada: 20,
    qtd_aposta_min: 50,
    qtd_aposta_max: 50,
    preco_base: 3.0,
  },
  quina: {
    id: "quina",
    nome: "Quina",
    numero_min: 1,
    numero_max: 80,
    qtd_sorteada: 5,
    qtd_aposta_min: 5,
    qtd_aposta_max: 15,
    preco_base: 2.5,
  },
  duplasena: {
    id: "duplasena",
    nome: "Dupla Sena",
    numero_min: 1,
    numero_max: 50,
    qtd_sorteada: 6,
    qtd_aposta_min: 6,
    qtd_aposta_max: 15,
    preco_base: 2.5,
  },
  timemania: {
    id: "timemania",
    nome: "Timemania",
    numero_min: 1,
    numero_max: 80,
    qtd_sorteada: 7,
    qtd_aposta_min: 10,
    qtd_aposta_max: 10,
    preco_base: 3.5,
  },
};

export const LISTA_LOTERIAS: Loteria[] = Object.values(LOTERIAS);

export const PESOS_PADRAO: Pesos = {
  peso_frequencia: 1.0,
  peso_atraso: 1.0,
  peso_tendencia: 1.0,
  peso_pares: 1.0,
  peso_trios: 1.0,
  peso_soma: 1.0,
  peso_distribuicao: 1.0,
  peso_cobertura: 1.0,
};

// Multiplicadores que cada modo aplica sobre os pesos base.
// IA Adaptativa nao tem multiplicador fixo: usa os pesos salvos/aprendidos.
export const PERFIL_ESTRATEGIA: Record<Estrategia, Partial<Pesos>> = {
  conservador: {
    peso_frequencia: 1.8,
    peso_atraso: 0.5,
    peso_tendencia: 0.8,
  },
  equilibrado: {
    peso_frequencia: 1.0,
    peso_atraso: 1.0,
    peso_tendencia: 1.0,
    peso_distribuicao: 1.2,
  },
  agressivo: {
    peso_frequencia: 0.6,
    peso_atraso: 1.7,
    peso_tendencia: 1.5,
    peso_pares: 0.8,
  },
  adaptativo: {},
};

export const ROTULO_ESTRATEGIA: Record<Estrategia, string> = {
  conservador: "Conservador",
  equilibrado: "Equilibrado",
  agressivo: "Agressivo",
  adaptativo: "IA Adaptativa",
};

export function getLoteria(id: LoteriaId): Loteria {
  const l = LOTERIAS[id];
  if (!l) throw new Error(`Loteria desconhecida: ${id}`);
  return l;
}

// Lista completa de numeros possiveis [numero_min..numero_max]
export function universo(l: Loteria): number[] {
  const out: number[] = [];
  for (let n = l.numero_min; n <= l.numero_max; n++) out.push(n);
  return out;
}
