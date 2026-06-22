import { describe, it, expect } from "vitest";
import { getLoteria } from "../src/lib/lotteries";
import { qualidadeConjunto, diversidadeConjunto } from "../src/lib/stats/quality";
import { concursosSimilares } from "../src/lib/stats/similarity";
import { resumirMemoria, ajusteDaMemoria } from "../src/lib/stats/memoria";
import type { AnaliseErro, Concurso } from "../src/lib/types";

function hist(qtd: number, max: number, sorteados: number): Concurso[] {
  const out: Concurso[] = [];
  for (let c = 1; c <= qtd; c++) {
    const nums = new Set<number>();
    let seed = c * 7919 + 13;
    while (nums.size < sorteados) {
      seed = (seed * 9301 + 49297) % 233280;
      nums.add(1 + (seed % max));
    }
    out.push({
      numero_concurso: c,
      data_sorteio: "2025-01-01",
      numeros_sorteados: [...nums].sort((a, b) => a - b),
    });
  }
  return out;
}

describe("qualidade", () => {
  const lf = getLoteria("lotofacil");
  const h = hist(200, 25, 15);

  it("retorna nota 0-100 para conjunto e por jogo", () => {
    const jogos = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 25, 1, 3],
    ];
    const q = qualidadeConjunto(lf, jogos, h);
    expect(q.total).toBeGreaterThanOrEqual(0);
    expect(q.total).toBeLessThanOrEqual(100);
    expect(q.por_jogo).toHaveLength(2);
  });

  it("diversidade: jogos identicos ~0, jogos distintos alto", () => {
    const iguais = diversidadeConjunto([
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
    ]);
    const distintos = diversidadeConjunto([
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
    ]);
    expect(iguais).toBe(0);
    expect(distintos).toBe(100);
    expect(distintos).toBeGreaterThan(iguais);
  });
});

describe("similaridade", () => {
  it("encontra o concurso identico como 100% similar", () => {
    const h: Concurso[] = [
      { numero_concurso: 10, data_sorteio: "2025-01-01", numeros_sorteados: [1, 2, 3, 4, 5] },
      { numero_concurso: 11, data_sorteio: "2025-01-02", numeros_sorteados: [10, 20, 30, 40, 50] },
    ];
    const top = concursosSimilares([1, 2, 3, 4, 5], h, 2);
    expect(top[0].numero_concurso).toBe(10);
    expect(top[0].similaridade).toBe(100);
    expect(top[1].similaridade).toBeLessThan(100);
  });
});

describe("memoria de erros", () => {
  function falha(over: Partial<AnaliseErro>): AnaliseErro {
    return {
      faixa_faltante: [],
      soma_jogo_media: 180,
      soma_resultado: 180,
      pares_jogo: 7,
      pares_resultado: 7,
      atrasados_acertados: 1,
      frequentes_acertados: 2,
      observacoes: [],
      ...over,
    };
  }

  it("memoria curta nao gera ajuste", () => {
    const r = resumirMemoria([falha({}), falha({})]);
    expect(Object.keys(ajusteDaMemoria(r))).toHaveLength(0);
  });

  it("vies recorrente de atrasados improdutivos reduz peso_atraso", () => {
    const analises = Array.from({ length: 10 }, () =>
      falha({ atrasados_acertados: 0 }),
    );
    const r = resumirMemoria(analises);
    const aj = ajusteDaMemoria(r);
    expect(aj.peso_atraso).toBeLessThan(0);
    expect(aj.peso_tendencia ?? 0).toBeGreaterThan(0);
  });
});
