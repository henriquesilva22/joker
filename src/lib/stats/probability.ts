import type { Loteria } from "../types";

// Coeficiente binomial C(n, k) com cuidado para nao estourar precisao.
export function combinacoes(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let res = 1;
  for (let i = 0; i < k; i++) {
    res = (res * (n - i)) / (i + 1);
  }
  return res;
}

// Chance de acertar o premio principal com uma aposta de `dezenas` dezenas.
// Numero de combinacoes vencedoras = C(dezenas, qtd_sorteada).
// Total = C(universo, qtd_sorteada).
export function chancePrincipal(loteria: Loteria, dezenas: number): number {
  const universo = loteria.numero_max - loteria.numero_min + 1;
  const total = combinacoes(universo, loteria.qtd_sorteada);
  const favoraveis = combinacoes(dezenas, loteria.qtd_sorteada);
  if (favoraveis <= 0) return 0;
  return favoraveis / total; // probabilidade (0..1)
}

// "1 em N" para exibir na UI.
export function umEmQuantos(prob: number): number {
  if (prob <= 0) return Infinity;
  return Math.round(1 / prob);
}

// Chance combinada de pelo menos uma premiacao principal em `qtdJogos` jogos
// independentes de mesma dezena (aproximacao por uniao).
export function chanceComJogos(
  loteria: Loteria,
  dezenas: number,
  qtdJogos: number,
): number {
  const p = chancePrincipal(loteria, dezenas);
  return 1 - (1 - p) ** qtdJogos;
}

// Probabilidade de obter exatamente `acertos` numa aposta de `dezenas` dezenas.
// Hipergeometrica: C(s, a) * C(N-s, dezenas-a) / C(N, dezenas)
export function chanceExata(
  loteria: Loteria,
  dezenas: number,
  acertos: number,
): number {
  const N = loteria.numero_max - loteria.numero_min + 1;
  const s = loteria.qtd_sorteada;
  const favoraveis =
    combinacoes(s, acertos) * combinacoes(N - s, dezenas - acertos);
  const total = combinacoes(N, dezenas);
  if (total <= 0) return 0;
  return favoraveis / total;
}

export function formatarUmEm(prob: number): string {
  const n = umEmQuantos(prob);
  if (!isFinite(n)) return "—";
  return `1 em ${n.toLocaleString("pt-BR")}`;
}
