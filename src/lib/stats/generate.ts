import type {
  Concurso,
  Estrategia,
  Loteria,
  Objetivo,
  Pesos,
} from "../types";
import { PERFIL_ESTRATEGIA, PESOS_PADRAO } from "../lotteries";
import { calcularFeatures, faixaIndice, type Features } from "./features";
import { amostrarPonderado, criarRng, sementeAleatoria } from "./rng";

export interface OpcoesGeracao {
  loteria: Loteria;
  concursos: Concurso[];
  pesos: Pesos;             // pesos base (aprendidos/salvos)
  estrategia: Estrategia;
  qtdJogos: number;
  qtdDezenas: number;       // dezenas por jogo (entre aposta_min e aposta_max)
  objetivo: Objetivo;
  seed?: number;
}

export interface JogoGerado {
  numeros: number[];
  soma: number;
  pares: number;
  distribuicao: [number, number, number]; // baixos, medios, altos
}

// Aplica o multiplicador do modo escolhido sobre os pesos base.
export function pesosEfetivos(base: Pesos, estrategia: Estrategia): Pesos {
  const mult = PERFIL_ESTRATEGIA[estrategia] ?? {};
  const out = { ...PESOS_PADRAO, ...base };
  for (const k of Object.keys(mult) as (keyof Pesos)[]) {
    out[k] = (out[k] ?? 1) * (mult[k] ?? 1);
  }
  return out;
}

// Pontuacao base por numero (sem efeitos de cobertura, que sao por jogo).
function scoreBase(f: Features, p: Pesos): Map<number, number> {
  const score = new Map<number, number>();
  for (const n of f.numeros) {
    const s =
      p.peso_frequencia * (f.frequencia.get(n) ?? 0) +
      p.peso_atraso * (f.atraso.get(n) ?? 0) +
      p.peso_tendencia * (f.tendencia.get(n) ?? 0) +
      p.peso_pares * (f.forcaPares.get(n) ?? 0) +
      p.peso_trios * (f.forcaTrios.get(n) ?? 0);
    // desloca para >=0 e adiciona piso para todo numero ter chance
    score.set(n, Math.max(0.001, s + 0.001));
  }
  return score;
}

// Cotas por faixa proporcionais a distribuicao historica, somando qtdDezenas.
function cotasPorFaixa(f: Features, qtdDezenas: number): [number, number, number] {
  const totalAlvo = f.faixaAlvo.reduce((a, b) => a + b, 0) || 1;
  const bruto = f.faixaAlvo.map((v) => (v / totalAlvo) * qtdDezenas);
  const cotas = bruto.map((v) => Math.floor(v)) as [number, number, number];
  let resto = qtdDezenas - cotas[0] - cotas[1] - cotas[2];
  // distribui o resto para as faixas com maior parte fracionaria
  const frac = bruto
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  let k = 0;
  while (resto > 0) {
    cotas[frac[k % 3].i]++;
    resto--;
    k++;
  }
  return cotas;
}

export function gerarJogos(opts: OpcoesGeracao): JogoGerado[] {
  const { loteria, concursos, qtdJogos, qtdDezenas, objetivo } = opts;
  const f = calcularFeatures(loteria, concursos);
  const p = pesosEfetivos(opts.pesos, opts.estrategia);
  const base = scoreBase(f, p);
  const rng = criarRng(opts.seed ?? sementeAleatoria());

  // objetivo "parciais" valoriza espalhar / cobrir; "principal" foca no score puro
  const fatorCobertura = p.peso_cobertura * (objetivo === "parciais" ? 1.6 : 1.0);
  const usoGlobal = new Map<number, number>(f.numeros.map((n) => [n, 0]));

  const cotas = cotasPorFaixa(f, qtdDezenas);
  const porFaixa: number[][] = [[], [], []];
  for (const n of f.numeros) porFaixa[faixaIndice(loteria, n)].push(n);

  const jogos: JogoGerado[] = [];
  for (let g = 0; g < qtdJogos; g++) {
    const escolhidos = new Set<number>();

    // 1) preenche respeitando as cotas por faixa (controle de distribuicao)
    for (let faixa = 0; faixa < 3; faixa++) {
      const candidatos = porFaixa[faixa].filter((n) => !escolhidos.has(n));
      let restamNaFaixa = Math.min(cotas[faixa], candidatos.length);
      const pool = [...candidatos];
      while (restamNaFaixa > 0 && pool.length > 0) {
        const pesos = pool.map((n) => {
          const cob = fatorCobertura * (usoGlobal.get(n) ?? 0);
          const distBoost = p.peso_distribuicao; // reforca seguir a faixa-alvo
          return (base.get(n) ?? 0) * distBoost - cob;
        });
        const idx = amostrarPonderado(pesos, rng);
        escolhidos.add(pool[idx]);
        pool.splice(idx, 1);
        restamNaFaixa--;
      }
    }

    // 2) completa o que faltar (caso cotas nao tenham fechado) com score puro
    const faltam = qtdDezenas - escolhidos.size;
    if (faltam > 0) {
      const pool = f.numeros.filter((n) => !escolhidos.has(n));
      for (let i = 0; i < faltam && pool.length > 0; i++) {
        const pesos = pool.map(
          (n) => (base.get(n) ?? 0) - fatorCobertura * (usoGlobal.get(n) ?? 0),
        );
        const idx = amostrarPonderado(pesos, rng);
        escolhidos.add(pool[idx]);
        pool.splice(idx, 1);
      }
    }

    // 3) ajuste fino de soma: troca para aproximar da soma media historica
    let numeros = [...escolhidos].sort((a, b) => a - b);
    numeros = ajustarSoma(numeros, f, loteria, p, base, rng);

    for (const n of numeros) usoGlobal.set(n, (usoGlobal.get(n) ?? 0) + 1);
    jogos.push(montarJogo(numeros, loteria));
  }
  return jogos;
}

// Tenta aproximar a soma do jogo da media historica via trocas baratas,
// proporcional ao peso_soma (peso baixo = quase nao mexe).
function ajustarSoma(
  numeros: number[],
  f: Features,
  loteria: Loteria,
  p: Pesos,
  base: Map<number, number>,
  rng: () => number,
): number[] {
  if (p.peso_soma <= 0.05) return numeros;
  const tentativas = Math.round(6 * Math.min(2, p.peso_soma));
  let atual = [...numeros];
  let somaAtual = atual.reduce((a, b) => a + b, 0);
  const dentro = new Set(atual);

  for (let t = 0; t < tentativas; t++) {
    const erro = somaAtual - f.somaMedia;
    if (Math.abs(erro) <= f.somaDesvio * 0.5) break;
    // se soma alta demais, troca um numero alto por um mais baixo (e vice-versa)
    const idxRemove = erro > 0
      ? maiorIndice(atual)
      : menorIndice(atual);
    const alvoRemovido = atual[idxRemove];
    const candidatos = f.numeros.filter(
      (n) => !dentro.has(n) && (erro > 0 ? n < alvoRemovido : n > alvoRemovido),
    );
    if (candidatos.length === 0) continue;
    const pesos = candidatos.map((n) => base.get(n) ?? 0);
    const novo = candidatos[amostrarPonderado(pesos, rng)];
    dentro.delete(alvoRemovido);
    dentro.add(novo);
    atual[idxRemove] = novo;
    somaAtual = somaAtual - alvoRemovido + novo;
  }
  return atual.sort((a, b) => a - b);
}

function maiorIndice(arr: number[]): number {
  let idx = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[idx]) idx = i;
  return idx;
}
function menorIndice(arr: number[]): number {
  let idx = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] < arr[idx]) idx = i;
  return idx;
}

export function montarJogo(numeros: number[], loteria: Loteria): JogoGerado {
  const ordenado = [...numeros].sort((a, b) => a - b);
  const soma = ordenado.reduce((a, b) => a + b, 0);
  const pares = ordenado.filter((n) => n % 2 === 0).length;
  const dist: [number, number, number] = [0, 0, 0];
  for (const n of ordenado) dist[faixaIndice(loteria, n)]++;
  return { numeros: ordenado, soma, pares, distribuicao: dist };
}
