// PRNG deterministico (mulberry32) para geracao reproduzivel em backtests.
export function criarRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sementeAleatoria(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

// Amostra um indice ponderado por `pesos` (>=0) usando rng em [0,1).
export function amostrarPonderado(pesos: number[], rng: () => number): number {
  const total = pesos.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return Math.floor(rng() * pesos.length);
  let alvo = rng() * total;
  for (let i = 0; i < pesos.length; i++) {
    alvo -= Math.max(0, pesos[i]);
    if (alvo <= 0) return i;
  }
  return pesos.length - 1;
}
