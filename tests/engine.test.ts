import { describe, it, expect } from "vitest";
import { getLoteria } from "../src/lib/lotteries";
import { gerarJogos } from "../src/lib/stats/generate";
import { conferir, contarAcertos } from "../src/lib/stats/check";
import { aplicarAjuste } from "../src/lib/stats/learn";
import { chancePrincipal, umEmQuantos } from "../src/lib/stats/probability";
import { PESOS_PADRAO } from "../src/lib/lotteries";
import type { Concurso } from "../src/lib/types";

// Gera um historico sintetico deterministico para testes.
function historicoFake(qtd: number, max: number, sorteados: number): Concurso[] {
  const out: Concurso[] = [];
  for (let c = 1; c <= qtd; c++) {
    const nums = new Set<number>();
    let seed = c * 9301 + 49297;
    while (nums.size < sorteados) {
      seed = (seed * 9301 + 49297) % 233280;
      nums.add(1 + (seed % max));
    }
    out.push({
      numero_concurso: c,
      data_sorteio: "2020-01-01",
      numeros_sorteados: [...nums].sort((a, b) => a - b),
    });
  }
  return out;
}

describe("probabilidade", () => {
  it("Mega-Sena 6 dezenas ~ 1 em 50.063.860", () => {
    const p = chancePrincipal(getLoteria("megasena"), 6);
    expect(umEmQuantos(p)).toBe(50063860);
  });
  it("mais dezenas aumenta a chance", () => {
    const mega = getLoteria("megasena");
    expect(chancePrincipal(mega, 7)).toBeGreaterThan(chancePrincipal(mega, 6));
  });
});

describe("geracao", () => {
  const mega = getLoteria("megasena");
  const hist = historicoFake(300, 60, 6);

  it("gera a quantidade pedida de jogos com dezenas corretas", () => {
    const jogos = gerarJogos({
      loteria: mega, concursos: hist, pesos: PESOS_PADRAO,
      estrategia: "equilibrado", qtdJogos: 8, qtdDezenas: 6,
      objetivo: "principal", seed: 42,
    });
    expect(jogos).toHaveLength(8);
    for (const j of jogos) {
      expect(j.numeros).toHaveLength(6);
      expect(new Set(j.numeros).size).toBe(6); // sem repetidos
      for (const n of j.numeros) expect(n).toBeGreaterThanOrEqual(1);
      for (const n of j.numeros) expect(n).toBeLessThanOrEqual(60);
    }
  });

  it("e deterministico com a mesma seed", () => {
    const opts = {
      loteria: mega, concursos: hist, pesos: PESOS_PADRAO,
      estrategia: "equilibrado" as const, qtdJogos: 3, qtdDezenas: 6,
      objetivo: "principal" as const, seed: 7,
    };
    expect(gerarJogos(opts)).toEqual(gerarJogos(opts));
  });
});

describe("conferencia e aprendizado", () => {
  it("conta acertos corretamente", () => {
    expect(contarAcertos([1, 2, 3, 4, 5, 6], [4, 5, 6, 7, 8, 9])).toBe(3);
  });

  it("conferir gera analise e ajuste de pesos dentro dos limites", () => {
    const mega = getLoteria("megasena");
    const hist = historicoFake(200, 60, 6);
    const conf = conferir(
      mega,
      [[1, 2, 3, 4, 5, 6]],
      [4, 5, 6, 50, 55, 60],
      hist,
      PESOS_PADRAO,
    );
    expect(conf.melhor_acerto).toBe(3);
    const novos = aplicarAjuste(PESOS_PADRAO, conf.ajuste_sugerido);
    for (const v of Object.values(novos)) {
      expect(v).toBeGreaterThanOrEqual(0.1);
      expect(v).toBeLessThanOrEqual(3.0);
    }
  });
});
